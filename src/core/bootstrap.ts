import { existsSync, readFileSync } from 'fs';
import { ConfigSchema, Config } from './config';
import { Scanner } from './scanner';
import { Runner } from './runner';
import { RuleResult } from './rules';
import { LineLimitsRule } from '../rules/line-limits';
import { NamingConventionRule } from '../rules/naming-convention';
import { DeadCodeRule } from '../rules/dead-code';
import { ComplexityRule } from '../rules/complexity';
import { CircularDependenciesRule } from '../rules/circular-dependencies';
import { NoAnyRule } from '../rules/no-any';
import { NoEnumRule } from '../rules/no-enum';

// Create a runner populated with all rules enabled in the config
export function createRunner(config: Config): Runner {
  const runner = new Runner();
  if (config.rules?.['line-limits']) runner.addRule(new LineLimitsRule());
  if (config.rules?.['naming-convention']) runner.addRule(new NamingConventionRule());
  if (config.rules?.['dead-code']) runner.addRule(new DeadCodeRule());
  if (config.rules?.['complexity']) runner.addRule(new ComplexityRule());
  if (config.rules?.['circular-dependencies']) runner.addRule(new CircularDependenciesRule());
  if (config.rules?.['no-any']) runner.addRule(new NoAnyRule());
  if (config.rules?.['no-enum']) runner.addRule(new NoEnumRule());
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
  } catch (err: any) {
    return { success: false, error: `Failed to load config file: ${err.message}` };
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
