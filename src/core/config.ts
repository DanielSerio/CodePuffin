import { z } from 'zod';

// Module boundary rule configuration
const ModuleBoundaryRuleSchema = z.object({
  importer: z.string().describe('Name of the module or glob pattern for the importing file'),
  imports: z.string().describe('Name of the module or glob pattern for the imported file'),
  allow: z.boolean(),
  message: z.string().optional(),
});

// Layer allowed import rule
const LayerAllowedSchema = z.object({
  importer: z.string().describe('Name of the layer/module'),
  imports: z.array(z.string()).describe('List of allowed layer/module names'),
});

export const ConfigSchema = z.object({
  project: z.object({
    include: z.array(z.string()).default(['src/**/*']),
    exclude: z.array(z.string()).default(['node_modules', 'dist', '**/*.test.*']),
    aliases: z.record(z.string()).default({ '@/*': 'src/*' }),
  }).default({}),

  // Central Registry for Named Patterns
  modules: z.record(z.string()).optional().describe('Central registry of named patterns (e.g., features, layers, components)'),

  rules: z.object({
    'circular-dependencies': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
      maxDepth: z.number().optional(),
      ignorePaths: z.array(z.string()).optional(),
    }).optional(),

    'module-boundaries': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
      // rules reference the central 'modules' registry
      rules: z.array(ModuleBoundaryRuleSchema).describe('Import rules between modules'),
    }).optional(),

    'layer-violations': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
      // allowed references the central 'modules' registry
      allowed: z.array(LayerAllowedSchema).describe('Allowed import directions between modules/layers'),
    }).optional(),

    'public-api-only': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
      modules: z.array(z.string()).describe('Glob patterns OR names from the central module registry'),
      exceptions: z.array(z.string()).optional().describe('File patterns exempt from this rule'),
    }).optional(),
  }).default({}),

  output: z.object({
    format: z.enum(['json', 'markdown', 'stylish']).default('stylish'),
    reportFile: z.string().optional(),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
