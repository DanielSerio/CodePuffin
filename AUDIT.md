# CodePuffin Source Audit

**Scope**: Full audit of `src/` directory (13 files)
**Date**: 2026-02-07

---

## Overview

CodePuffin is a static analysis CLI tool for architectural enforcement. The `src/` directory contains:
- **Core** (6 files): CLI entry, config schema, rule types, runner, scanner, reporter
- **Rules** (4 files): circular-dependencies, module-boundaries, layer-violations, public-api-only
- **Plugins** (2 files): Vite build plugin, Next.js rewrites plugin

The codebase is generally well-structured with clean separation of concerns. However, this audit identifies several issues across correctness, DRY violations, security, and documentation staleness.

---

## Critical Issues

### 1. Broken Import Resolution in 3 of 4 Rules

**Files**: `src/rules/module-boundaries.ts:54-60`, `src/rules/layer-violations.ts:54-60`, `src/rules/public-api-only.ts:54-60`

The `resolveImportPath` function in these three rules only does `path.resolve(dir, specifier)` - it does NOT try file extensions or index files. This means an import like `import { foo } from './bar'` (which resolves to `./bar.ts` on disk) will NOT be correctly resolved, causing the rules to silently miss violations.

In contrast, `circular-dependencies.ts` has a proper `resolveImport` function (lines 15-40) that tries `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` extensions and `index.*` files. The three newer rules do not use this logic.

**Impact**: Module boundary, layer violation, and public API violations may go entirely undetected for any import that omits the file extension (which is the standard TypeScript convention).

### 2. Unused Config Options (Dead Config)

**File**: `src/core/config.ts:33-34`

The `circular-dependencies` rule schema defines `maxDepth` and `ignorePaths` options, but neither is read or used in `src/rules/circular-dependencies.ts`. Users who configure these options will see no effect - a silent failure.

### 3. `any` Type Usage

**File**: `src/core/reporter.ts:143`

```typescript
} catch (err: any) {
```

This violates the project's own TypeScript principle ("Do not use `any` type"). Should use `unknown` with a type guard, consistent with how `src/core/bootstrap.ts:34` handles the same pattern.

---

## DRY Violations

### 4. `extractImports` Duplicated 3 Times

The exact same ~40-line `extractImports` function is copy-pasted verbatim across three files:
- `src/rules/module-boundaries.ts:10-51`
- `src/rules/layer-violations.ts:10-51`
- `src/rules/public-api-only.ts:10-51`

The only difference is the warning label string (`[module-boundaries]` vs `[layer-violations]` vs `[public-api-only]`). This should be extracted into a shared utility (e.g., `src/utils/imports.ts`).

### 5. `resolveImportPath` Duplicated 3 Times

The identical `resolveImportPath` function is duplicated across the same three files:
- `src/rules/module-boundaries.ts:54-60`
- `src/rules/layer-violations.ts:54-60`
- `src/rules/public-api-only.ts:54-60`

### 6. Pattern Matching Logic Nearly Duplicated

`findModule` in `module-boundaries.ts:63-83` and `findLayer` in `layer-violations.ts:69-89` perform essentially the same logic (match a file against glob patterns, expand `/*` to `/**/*`). They differ only in input shape (`Record<string, string>` vs `LayerDef[]`).

### 7. File Extension Filter Duplicated

The regex `/\.(ts|tsx|js|jsx|mjs|cjs)$/` is repeated in:
- `src/rules/module-boundaries.ts:97`
- `src/rules/layer-violations.ts:122`
- `src/rules/public-api-only.ts:144`

Meanwhile, `src/core/scanner.ts:6-12` maintains a separate `SOURCE_EXTENSIONS` set. These two mechanisms for filtering source files should be unified.

---

## Correctness Issues

### 8. `detectCycles` May Miss Some Cycles

**File**: `src/rules/circular-dependencies.ts:113-159`

The DFS algorithm permanently marks nodes as `visited` after processing. If a node is reachable via multiple paths, cycles through later paths will not be discovered. For most practical codebases this works adequately, but it is not a complete cycle detection algorithm (e.g., Johnson's algorithm would be).

### 9. Unused `relFile` Variable

**File**: `src/rules/module-boundaries.ts:120`

```typescript
const relFile = path.relative(context.root, filePath).replace(/\\/g, '/');
```

This variable is computed but never used.

### 10. Unused `existsSync` Import

**File**: `src/rules/public-api-only.ts:4`

```typescript
import { readFileSync, existsSync } from 'fs';
```

`existsSync` is imported but never used in this file.

### 11. Inconsistent Path Normalization

**File**: `src/core/scanner.ts:30`

`context.root` is set via `path.resolve(root)` which on Windows produces backslash paths (e.g., `C:\developer\code-scanner`). But discovered files are normalized to forward slashes (line 47). This inconsistency means `path.relative(context.root, filePath)` operates on mixed separators. While Node.js handles this, it's a latent cross-platform hazard.

---

## Security & Robustness

### 12. No Path Sandboxing for Config Patterns

**File**: `src/core/scanner.ts:40-45`

The `include` patterns from `puffin.json` are passed directly to `fast-glob` with no validation. A config like `{ "include": ["../../**/*"] }` would scan outside the project root. Similarly, `reportFile` in `src/core/reporter.ts:137` could write to an absolute path anywhere on the filesystem via `path.resolve(root, finalFileName)`.

### 13. No File Size Limits

**Files**: All rule files using `readFileSync`

Every rule reads file contents via `readFileSync` with no size check. A multi-gigabyte file in the scan scope could exhaust memory.

### 14. No Timeout on Rule Execution

**File**: `src/core/runner.ts:12-14`

`Promise.all` runs all rules concurrently with no timeout. If any rule hangs (e.g., deep dependency graph on a very large codebase), the entire CLI hangs indefinitely.

### 15. Vite Plugin Runs Full Scan on Every HMR Update

**File**: `src/plugins/vite.ts:68-70`

`handleHotUpdate` triggers a complete re-scan of the entire project on every file change. For large codebases this would cause severe developer experience degradation. There is no debouncing, caching, or incremental analysis.

---

## Documentation Staleness

### 16. CLAUDE.md Architecture Section is Outdated

The project CLAUDE.md describes rules and utilities that have been deleted:
- `src/rules/line-limits.ts` - deleted
- `src/rules/naming-convention.ts` - deleted
- `src/rules/dead-code.ts` - deleted
- `src/rules/complexity.ts` - deleted
- `src/rules/no-any.ts` - deleted
- `src/rules/no-enum.ts` - deleted
- `src/utils/naming.ts` - deleted

And does not document the new rules:
- `src/rules/module-boundaries.ts` - not documented
- `src/rules/layer-violations.ts` - not documented
- `src/rules/public-api-only.ts` - not documented

### 17. Missing `suggestion` Field on Most Rules

Only `public-api-only` populates the `suggestion` field on `RuleResult`. The other three rules leave it `undefined`, causing the markdown report's "Suggested Action" column to always show "N/A" for their violations.

---

## Minor Issues

### 18. Non-null Assertion

**File**: `src/rules/circular-dependencies.ts:107`

```typescript
graph.get(fromFile)!.add(resolved);
```

The logic guarantees the key exists, but the `!` assertion is fragile. A guard or default would be safer.

### 19. `typescript` Is a Runtime Dependency Listed as devDependency

**File**: `package.json:32`

All four rules use the `typescript` package at runtime for AST parsing. It is listed under `devDependencies` rather than `dependencies`. This works if `tsup` bundles it, but makes the dependency relationship unclear and could break library consumers.

### 20. Next.js Plugin Uses `rewrites` as Lifecycle Hook

**File**: `src/plugins/next.ts:22`

The plugin piggybacks on the `rewrites()` config hook to run the scan. This is an implementation detail that could break if Next.js changes when/how `rewrites` is invoked. A `webpack` or `turbopack` plugin hook would be a more conventional approach.

---

## Summary Table

| # | Severity | Category | Location | Description |
|---|----------|----------|----------|-------------|
| 1 | Critical | Correctness | 3 rule files | `resolveImportPath` doesn't try extensions/index files |
| 2 | High | Correctness | config.ts / circular-dependencies.ts | `maxDepth` and `ignorePaths` defined but unused |
| 3 | Medium | Code Quality | reporter.ts:143 | `any` type violates project rules |
| 4 | High | DRY | 3 rule files | `extractImports` duplicated 3x (~120 lines) |
| 5 | Medium | DRY | 3 rule files | `resolveImportPath` duplicated 3x |
| 6 | Low | DRY | module-boundaries + layer-violations | Similar pattern matching logic |
| 7 | Low | DRY | 3 rule files + scanner | Duplicated extension filtering |
| 8 | Low | Correctness | circular-dependencies.ts | Cycle detection not exhaustive |
| 9 | Low | Code Quality | module-boundaries.ts:120 | Unused variable `relFile` |
| 10 | Low | Code Quality | public-api-only.ts:4 | Unused import `existsSync` |
| 11 | Low | Correctness | scanner.ts:30 | Mixed path separator convention |
| 12 | Medium | Security | scanner.ts, reporter.ts | No path sandboxing on config patterns |
| 13 | Low | Robustness | All rule files | No file size limits on `readFileSync` |
| 14 | Low | Robustness | runner.ts | No timeout on rule execution |
| 15 | Medium | Performance | vite.ts:68-70 | Full re-scan on every HMR update |
| 16 | High | Documentation | CLAUDE.md | Architecture docs describe deleted files |
| 17 | Low | UX | 3 rule files | Missing `suggestion` field |
| 18 | Low | Code Quality | circular-dependencies.ts:107 | Non-null assertion |
| 19 | Low | Build | package.json | `typescript` runtime dep listed as devDep |
| 20 | Low | Design | next.ts | Using `rewrites` as scan hook is fragile |

---

*Audit generated for CodePuffin `src/` directory.*
