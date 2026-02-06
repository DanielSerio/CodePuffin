import { z } from 'zod';

// Per-module overrides for naming conventions
const NamingOverrideSchema = z.object({
  files: z.string().optional(),
  variables: z.string().optional(),
  functions: z.string().optional(),
  classes: z.string().optional(),
  components: z.object({
    entity: z.string().optional(),
    filename: z.string().optional(),
  }).optional(),
});

export type NamingOverride = z.infer<typeof NamingOverrideSchema>;

export const ConfigSchema = z.object({
  project: z.object({
    include: z.array(z.string()).default(['src/**/*']),
    exclude: z.array(z.string()).default(['node_modules', 'dist', '**/*.test.*']),
  }).default({}),
  modules: z.record(z.string()).optional(),
  rules: z.object({
    'dead-code': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
      exclude: z.array(z.string()).optional(),
      unusedExports: z.boolean().default(true),
      unusedVariables: z.boolean().default(true),
    }).optional(),
    'line-limits': z.object({
      severity: z.enum(['error', 'warn']).default('warn'),
      default: z.number().default(100),
      overrides: z.record(z.number()).optional(),
    }).optional(),
    'naming-convention': z.object({
      severity: z.enum(['error', 'warn']).default('warn'),
      files: z.string().default('kebab-case'),
      variables: z.string().default('camelCase'),
      functions: z.string().default('camelCase'),
      classes: z.string().default('PascalCase'),
      components: z.object({
        entity: z.string().optional(),
        filename: z.string().optional(),
      }).optional(),
      overrides: z.record(NamingOverrideSchema).optional(),
    }).optional(),
    'complexity': z.object({
      severity: z.enum(['error', 'warn']).default('warn'),
      cyclomatic: z.number().default(10),
      cognitive: z.number().default(15),
      overrides: z.record(z.object({
        cyclomatic: z.number().optional(),
        cognitive: z.number().optional(),
      })).optional(),
    }).optional(),
    'circular-dependencies': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
    }).optional(),
    'no-any': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
    }).optional(),
    'no-enum': z.object({
      severity: z.enum(['error', 'warn']).default('error'),
    }).optional(),
  }).default({}),
  output: z.object({
    format: z.enum(['json', 'markdown', 'stylish']).default('stylish'),
    reportFile: z.string().optional(),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
