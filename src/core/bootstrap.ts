import { existsSync, readFileSync } from 'fs';
import { ConfigSchema, Config } from './config';
import { Scanner } from './scanner';
import { Runner } from './runner';
import { RuleResult } from './rules';
import { CircularDependenciesRule } from '../rules/circular-dependencies';
import { ModuleBoundariesRule } from '../rules/module-boundaries';
import { LayerViolationsRule } from '../rules/layer-violations';
import { PublicApiOnlyRule } from '../rules/public-api-only';

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

// Full scan pipeline: load config, discover files, run all enabled rules
export async function scan(root: string, configPath: string): Promise<{
  config: Config;
  results: RuleResult[];
  fileCount: number;
  modules: Record<string, string[]>;
}> {
  const loaded = loadConfig(configPath);
  if (!loaded.success) {
    throw new Error(`Invalid CodePuffin configuration:\n${loaded.error}`);
  }

  const scanner = new Scanner(root, loaded.data);
  const context = await scanner.createContext();
  const runner = createRunner(loaded.data);
  const results = await runner.run(context);

  return {
    config: loaded.data,
    results,
    fileCount: context.files.length,
    modules: context.modules,
  };
}
