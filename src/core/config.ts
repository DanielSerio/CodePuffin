import { z } from 'zod';

// Module boundary rule configuration
const ModuleBoundaryRuleSchema = z.object({
  importer: z.string(),
  imports: z.string(),
  allow: z.boolean(),
  message: z.string().optional(),
});

// Layer definition for layer-violations rule
const LayerSchema = z.object({
  name: z.string(),
  pattern: z.string(),
});

// Layer allowed import rule
const LayerAllowedSchema = z.object({
  importer: z.string(),
  imports: z.array(z.string()),
});

export const ConfigSchema = z.object({
  project: z.object({
    include: z.array(z.string()).default(['src/**/*']),
    exclude: z.array(z.string()).default(['node_modules', 'dist', '**/*.test.*']),
    aliases: z.record(z.string()).default({ '@/*': 'src/*' }),
  }).default({}),
  modules: z.record(z.string()).optional(),
  rules: z.object({
    // Architectural rules (kept)
    'circular-dependencies': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
      maxDepth: z.number().optional(),
      ignorePaths: z.array(z.string()).optional(),
    }).optional(),

    // New architectural rules
    'module-boundaries': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
      modules: z.record(z.string()).describe('Named module patterns, e.g., { "@features": "src/features/*" }'),
      rules: z.array(ModuleBoundaryRuleSchema).describe('Import rules between modules'),
    }).optional(),

    'layer-violations': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
      layers: z.array(LayerSchema).describe('Layer definitions with name and glob pattern'),
      allowed: z.array(LayerAllowedSchema).describe('Allowed import directions between layers'),
    }).optional(),

    'public-api-only': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
      modules: z.array(z.string()).describe('Glob patterns for modules that must be imported via index'),
      exceptions: z.array(z.string()).optional().describe('File patterns exempt from this rule'),
    }).optional(),
  }).default({}),
  output: z.object({
    format: z.enum(['json', 'markdown', 'stylish']).default('stylish'),
    reportFile: z.string().optional(),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
