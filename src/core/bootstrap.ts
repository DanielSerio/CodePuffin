import { existsSync, readFileSync } from 'fs';
import * as crypto from 'crypto';
import { ConfigSchema, Config } from './config';
import { Scanner } from './scanner';
import { Runner } from './runner';
import { RuleResult } from './rules';
import { CircularDependenciesRule } from '../rules/circular-dependencies';
import { ModuleBoundariesRule } from '../rules/module-boundaries';
import { LayerViolationsRule } from '../rules/layer-violations';
import { PublicApiOnlyRule } from '../rules/public-api-only';

export interface ScanOptions {
  clean?: boolean; // Force a full re-scan by clearing the cache
}

// Create a runner populated with all rules enabled in the config
export function createRunner(config: Config): Runner {
  const runner = new Runner();

  // Architectural rules
  if (config.rules?.['circular-dependencies']) runner.addRule(new CircularDependenciesRule());
  if (config.rules?.['module-boundaries']) runner.addRule(new ModuleBoundariesRule());
  if (config.rules?.['layer-violations']) runner.addRule(new LayerViolationsRule());
  if (config.rules?.['public-api-only']) runner.addRule(new PublicApiOnlyRule());

  return runner;
}

// Load a puffin.json file, parse it, and validate against the config schema.
// Returns a discriminated result so callers can handle errors in their own way.
export function loadConfig(configPath: string):
  | { success: true; data: Config; }
  | { success: false; error: string; } {
  let raw = {};
  try {
    if (existsSync(configPath)) {
      raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to load config file: ${message}` };
  }
  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: JSON.stringify(result.error.format(), null, 2) };
  }
  return { success: true, data: result.data };
}

// Compute a stable hash of the rules configuration to detect config changes
function hashRulesConfig(config: Config): string {
  const rulesJson = JSON.stringify(config.rules || {});
  return crypto.createHash('sha256').update(rulesJson).digest('hex');
}

// Scan pipeline with incremental result merging.
// On incremental runs, only dirty files are re-analyzed and results are merged
// with cached results for clean files.
export async function scan(root: string, configPath: string, options: ScanOptions = {}): Promise<{
  config: Config;
  results: RuleResult[];
  fileCount: number;
  modules: Record<string, string[]>;
  context: import('./scanner').ScanContext;
}> {
  const loaded = loadConfig(configPath);
  if (!loaded.success) {
    throw new Error(`Invalid CodePuffin configuration:\n${loaded.error}`);
  }

  const config = loaded.data;
  const scanner = new Scanner(root, config);
  const context = await scanner.createContext();
  const cache = scanner.getCacheService();

  // Detect config changes by comparing rule config hash
  const configHash = hashRulesConfig(config);
  const configChanged = cache.getConfigHash() !== configHash;

  // Clear cached results when config changed or --clean flag is set
  if (configChanged || options.clean) {
    cache.clearAllResults();
  }

  const runner = createRunner(config);
  const dirtySet = new Set(context.dirtyFiles);
  const isFullScan = configChanged || options.clean || context.dirtyFiles.length === context.allFiles.length;

  let results: RuleResult[];

  if (!isFullScan && context.dirtyFiles.length === 0) {
    // Nothing changed — return all cached results
    results = cache.getAllCachedResults();
  } else if (!isFullScan) {
    // Incremental mode: run rules only on dirty files, merge with cached
    const incrementalContext = {
      ...context,
      files: context.dirtyFiles,
    };

    const freshResults = await runner.run(incrementalContext);

    // Index fresh results by file
    const freshByFile = new Map<string, RuleResult[]>();
    for (const r of freshResults) {
      if (!freshByFile.has(r.file)) freshByFile.set(r.file, []);
      freshByFile.get(r.file)!.push(r);
    }

    // Cache fresh results for dirty files (clear old, store new)
    cache.clearResultsForFiles(context.dirtyFiles);
    for (const [file, fileResults] of freshByFile) {
      cache.setCachedResultsForFile(file, fileResults);
    }

    // Merge: fresh results for dirty files + cached results for clean files
    const cleanFiles = context.allFiles.filter(f => !dirtySet.has(f));
    const cachedResults = cleanFiles.flatMap(f => cache.getCachedResultsForFile(f));

    results = [...freshResults, ...cachedResults];
  } else {
    // Full scan: run rules on all files
    const fullResults = await runner.run(context);

    // Cache all results per-file
    cache.clearAllResults();
    const resultsByFile = new Map<string, RuleResult[]>();
    for (const r of fullResults) {
      if (!resultsByFile.has(r.file)) resultsByFile.set(r.file, []);
      resultsByFile.get(r.file)!.push(r);
    }
    for (const [file, fileResults] of resultsByFile) {
      cache.setCachedResultsForFile(file, fileResults);
    }

    results = fullResults;
  }

  // Persist config hash and cache
  cache.setConfigHash(configHash);
  cache.saveCache();

  return {
    config,
    results,
    fileCount: context.allFiles.length,
    modules: context.modules,
    context,
  };
}
