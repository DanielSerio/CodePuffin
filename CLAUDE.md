# CodePuffin

Static analysis CLI tool for architectural enforcement.

## Commands

- `pnpm build` - Build with tsup (outputs to `dist/`)
- `pnpm test:unit` - Run unit tests (vitest)
- `pnpm test:integration` - Build + run integration tests (playwright)
- `pnpm dev` - Watch mode rebuild + scan

## Architecture

```
src/
  cli/index.ts          - CLI entry point (commander). Calls scanner and runner, prints results.
  core/
    config.ts           - Zod schema for puffin.json. Central `modules` registry for named patterns.
    rules.ts            - Rule/RuleResult/Severity types.
    runner.ts           - Runs all rules concurrently with 30s timeout.
    scanner.ts          - File discovery and module resolution via fast-glob.
    reporter.ts         - Console, JSON, and Markdown reporting. Markdown includes Mermaid.
    graph.ts            - Module-level dependency graph and Mermaid diagram generation.
    bootstrap.ts        - loadConfig(), createRunner(), and scan() pipeline helpers.
  rules/
    circular-dependencies.ts - Import cycle detection via DFS.
    module-boundaries.ts     - Dependency restriction between global modules.
    layer-violations.ts      - Clean Architecture layer flow enforcement using global modules.
    public-api-only.ts       - Enforces imports through index.ts barrel exports.
  plugins/
    vite.ts             - Vite plugin with HMR support.
    next.ts             - Next.js plugin via `rewrites` hook.
  utils/
    imports.ts          - Shared import extraction, resolution (with aliases), and matching.
```

## Adding a New Rule

1. Create `src/rules/<rule-id>.ts` implementing the `Rule` interface.
2. Add rule config schema to the `rules` object in `src/core/config.ts`.
3. Register in `src/core/bootstrap.ts` inside `createRunner()`.
4. Add unit test in `tests/<rule-id>.test.ts` (use `mockContext` helper if needed).
5. Add integration fixture in `tests/integration/fixtures/<project>/`.
6. Add integration test in `tests/integration/` using playwright.

## Key Patterns

- **Centralized Modules**: Named patterns are defined in root `modules: { "name": "glob/*" }`.
- **Context Usage**: Rules access `context.config.modules` for centralized pattern definitions.
- **Reporting**: `writeReportFile` takes `ScanContext` and `RuleResult[]`.
- **Mermaid**: Markdown reports automatically include a `mermaid` architectural graph.
- **Alias Resolution**: `resolveImport` handles `@/*` path mapping using `project.aliases`.
- **Normalization**: All file paths are normalized to forward slashes: `.replace(/\\/g, '/')`.
- **Validation**: Glob patterns are restricted to the project root (no `..` or absolute paths).

## Testing

- Unit tests: vitest, in `tests/*.test.ts`. Use internal mocks where necessary.
- Integration tests: playwright, in `tests/integration/*.test.ts`.
- Mocking: `vi.mock('../src/utils/imports')` is common for isolating rule logic.
