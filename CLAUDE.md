# CodePuffin

Static analysis CLI tool for architectural enforcement.

## Commands

- `pnpm build` - Build with tsup (outputs to `dist/`)
- `pnpm test:unit` - Run unit tests (vitest)
- `pnpm test:integration` - Build + run integration tests (playwright)

## Architecture

```
src/
  cli/index.ts          - CLI entry point (commander). Always prints stylish, optionally writes report file.
  core/
    config.ts           - Zod schema for puffin.json. All rule configs live under `rules`.
    rules.ts            - Rule/RuleResult/Severity types.
    runner.ts           - Runs all rules concurrently via Promise.all.
    scanner.ts          - File discovery via fast-glob. Produces ScanContext (root, config, files, modules).
    reporter.ts         - reportStylish (console), reportJson, reportMarkdown.
    bootstrap.ts        - loadConfig(), createRunner() (registers enabled rules), scan() pipeline.
  rules/
    line-limits.ts      - File line count rule.
    naming-convention.ts - File/var/func/class naming via AST.
    dead-code.ts        - Unused exports via AST two-pass.
    complexity.ts       - Cyclomatic + cognitive complexity per function via AST.
    circular-dependencies.ts - Import cycle detection via DFS on directed graph.
  plugins/
    vite.ts             - Vite build plugin.
    next.ts             - Next.js rewrites plugin.
  utils/
    naming.ts           - Case style checkers (kebab, camel, Pascal, UPPER_SNAKE, useCamel).
```

## Adding a New Rule

1. Create `src/rules/<rule-id>.ts` implementing the `Rule` interface from `src/core/rules.ts`.
2. Add rule config schema to the `rules` object in `src/core/config.ts`.
3. Register in `src/core/bootstrap.ts` inside `createRunner()`.
4. Add unit test in `tests/<rule-id>.test.ts`.
5. Add integration fixture in `tests/integration/fixtures/<project>/` (puffin.json + src files).
6. Add integration test in `tests/integration/<rule-id>.test.ts` using spawnSync against `dist/index.js`.

## Key Patterns

- Rules read their config from `context.config.rules?.['<rule-id>']`, return early if undefined.
- Rules return `RuleResult[]` with `ruleId`, `file` (absolute), optional `line`, `message`, `severity`.
- Module overrides use `@moduleName` keys in config, resolved via `context.modules`.
- File paths in reports are normalized to forward slashes: `.replace(/\\/g, '/')`.
- Integration tests use `spawnSync('node', [cli, 'scan', '.'])` with `NO_COLOR=1`.
- Report file output supports `[timestamp]` placeholder in filename.

## Testing

- Unit tests: vitest, in `tests/*.test.ts`. No mocking frameworks - use inline helpers.
- Integration tests: playwright, in `tests/integration/*.test.ts`. Use fixtures in `tests/integration/fixtures/`.
- Test config parsing with `ConfigSchema.safeParse()`.
- Test rule logic by exporting pure calculation functions and testing them directly.
