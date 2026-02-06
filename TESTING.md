# Testing

CodePuffin has multiple integration targets (CLI, Vite Plugin, Next.js Plugin) that each need
end-to-end verification against real project structures. Our testing strategy is split into two
tiers: **unit tests** (Vitest) for isolated logic and **integration tests** (Playwright) for
full pipeline verification against the example applications.

## Running Tests

```bash
# Unit tests only (Vitest)
pnpm test:unit

# Integration/e2e tests only (Playwright)
pnpm test:integration

# All tests
pnpm test
```

> **Prerequisites:** Before running integration tests, build the project with `pnpm build` so
> that the CLI binary and plugin entry points are available in `dist/`.

---

## Unit Tests (Vitest)

Unit tests live in `tests/` and cover core logic in isolation. They should be fast, deterministic,
and free of file system side effects wherever possible.

### Current Coverage

| File                   | Covers                                            |
| ---------------------- | ------------------------------------------------- |
| `config.test.ts`       | `ConfigSchema` validation (defaults, valid/invalid inputs, overrides) |
| `bootstrap.test.ts`    | `loadConfig()` with missing/existing files, `createRunner()` factory  |
| `runner.test.ts`       | `Runner` execution (empty, single, multiple rules, concurrency)       |
| `naming.test.ts`       | `checkCase()` utility for all case styles                             |

### Gaps to Fill

The following areas have no unit test coverage and should be addressed:

#### Scanner (`src/core/scanner.ts`)

- File discovery with various include/exclude patterns
- Module resolution (files correctly grouped into named modules)
- Filtering to source extensions only (non-source files excluded)
- Empty project handling (no files matched)
- Overlapping module patterns

#### Reporter (`src/core/reporter.ts`)

- Output grouping by file
- Severity-based formatting (error vs. warn labels)
- Relative path display
- Empty results (no output)
- Mixed severities within a single file

#### Line Limits Rule (`src/rules/line-limits.ts`)

- Files under limit produce no results
- Files at exact limit produce no results
- Files over limit produce a result with correct line count
- Per-module overrides via `@moduleName` syntax
- Unreadable files are skipped gracefully

#### Naming Convention Rule (`src/rules/naming-convention.ts`)

- File name validation against configured style
- Variable, function, and class name detection via AST
- Per-module overrides
- Files that fail to parse are skipped
- Line numbers are accurate in reported results

#### Dead Code Rule (`src/rules/dead-code.ts`)

- Unused named exports are detected
- Exports that are imported elsewhere are not flagged
- Entry point files matching `exclude` patterns are skipped
- All supported export forms are handled (`export function`, `export class`, `export const`, `export { name }`)
- Re-exports are not false-positived

### Guidelines

- Use inline fixture strings or temp directories for file-based tests. Avoid coupling to real
  example app contents, which may change.
- Mock the file system (`vi.mock('fs')`) or use `vi.spyOn` when testing scanner/rule I/O.
- Keep each test focused on a single behavior. Name tests in the pattern:
  `"<unit> <does something> when <condition>"`.

---

## Integration Tests (Playwright)

Integration tests verify the full scanning pipeline end-to-end. Each test runs the actual CLI
binary or plugin against an example application and asserts on the output.

### Directory Structure

```
tests/
  integration/
    cli.test.ts              # CLI invocations against example apps
    vite-plugin.test.ts      # Vite build with plugin enabled
    next-plugin.test.ts      # Next.js build with plugin enabled
    fixtures/                # Minimal fixture projects (if needed beyond examples/)
```

### Test Targets

#### CLI (`tests/integration/cli.test.ts`)

The CLI is the primary interface. Integration tests should spawn `node dist/index.js scan`
as a child process and assert on stdout, stderr, and exit codes.

| Scenario                                       | Example App      | Expected Behavior                        |
| ---------------------------------------------- | ---------------- | ---------------------------------------- |
| Scan a project with known violations           | `examples/basic` | Exit code 1, stderr contains rule IDs    |
| Scan a clean project with no violations        | fixture          | Exit code 0, no error output             |
| Use `--config` flag to specify a custom config | `examples/basic` | Config is respected in scan results      |
| Missing config file falls back to defaults     | fixture          | Exit code 0, uses default config         |
| Invalid config file                            | fixture          | Exit code 1, user-friendly error message |
| Scan a directory with no source files          | fixture          | Exit code 0, no results                  |

**Implementation pattern:**

```ts
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

test('cli reports violations in basic example', () => {
  const cwd = path.resolve(__dirname, '../../examples/basic');
  const result = execSync('node ../../dist/index.js scan .', {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  // Assert on stdout/stderr content and exit code
});
```

#### Vite Plugin (`tests/integration/vite-plugin.test.ts`)

These tests run `vite build` on the `examples/react-app` project with the codepuffin plugin
enabled and verify that the build output includes the expected warnings/errors.

| Scenario                             | Expected Behavior                                     |
| ------------------------------------ | ----------------------------------------------------- |
| Build with violations present        | Build warns/errors with rule messages in Vite output   |
| Build with `severity: 'error'` rules | Build fails (non-zero exit code)                       |
| Build with `severity: 'warn'` rules  | Build succeeds but prints warnings                     |
| Plugin disabled via config           | Build succeeds with no codepuffin output               |

#### Next.js Plugin (`tests/integration/next-plugin.test.ts`)

These tests run `next build` or `next dev` on the `examples/nextjs-app` project with the
`withCodePuffin` wrapper and verify console output.

| Scenario                                 | Expected Behavior                               |
| ---------------------------------------- | ------------------------------------------------ |
| Dev server start with violations present | Console output includes codepuffin warnings       |
| Plugin enabled in CI mode                | Scan runs and reports results                     |
| Plugin disabled via `enabled: false`     | No codepuffin output                              |
| Missing puffin.json handled gracefully   | No crash, fallback to defaults                    |

### Fixture Strategy

Integration tests use two kinds of fixtures:

1. **Example apps** (`examples/basic`, `examples/react-app`, `examples/nextjs-app`) - Real
   project structures with intentional violations. These serve as the primary integration
   test environments.

2. **Minimal fixtures** (`tests/integration/fixtures/`) - Small, purpose-built projects for
   edge cases that don't fit the example apps (e.g., empty projects, invalid configs,
   projects with only clean code).

> Fixture projects should be as small as possible. A fixture for "clean project" might be a
> single valid `.ts` file with correct naming and no unused exports.

---

## Test Configuration

### Vitest (`vitest.config.ts` - to be created)

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/integration/**'],
  },
});
```

### Playwright (`playwright.config.ts` - to be created)

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/integration',
  timeout: 30_000,
});
```

### package.json Scripts

```json
{
  "scripts": {
    "test": "pnpm test:unit && pnpm test:integration",
    "test:unit": "vitest run",
    "test:integration": "pnpm build && playwright test"
  }
}
```

---

## CI Integration

The test suite should run in CI on every push and pull request. A GitHub Actions workflow
should:

1. Install dependencies (`pnpm install`)
2. Build the project (`pnpm build`)
3. Run unit tests (`pnpm test:unit`)
4. Run integration tests (`pnpm test:integration`)

Unit and integration tests can run as separate CI jobs to isolate failures and allow
parallelism.

---

## Adding a New Rule: Test Checklist

When adding a new rule to CodePuffin, the following tests should be written:

- [ ] **Unit test** for the rule's `run()` method with mock `ScanContext`
- [ ] **Unit test** for edge cases (empty files, unreadable files, files with no violations)
- [ ] **Unit test** for per-module overrides (if the rule supports them)
- [ ] **Integration fixture** with an example file that triggers the rule
- [ ] **CLI integration test** verifying the rule appears in output
- [ ] **Verify** the rule is wired up correctly in `createRunner()` (bootstrap test)
