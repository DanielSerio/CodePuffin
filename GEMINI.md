# Gemini Context: CodePuffin Static Analysis Tool

This document provides instructional context for interacting with the `CodePuffin` codebase.

## 1. Project Overview

`CodePuffin` is a high-performance, local-first static analysis tool for TypeScript projects. It is designed to enforce architectural integrity and code quality rules without relying on external APIs or AI services. Its core purpose is to be a deterministic and fast checker for rules that go beyond standard linting, such as dead code detection, architectural boundary enforcement, and circular dependency analysis.

The tool operates via two main interfaces:

1.  A Command-Line Interface (CLI) invoked with the `puffin` (via `dist/index.js`) command.
2.  Plugins for popular build tools like Vite and Next.js.

Configuration is managed through a `puffin.json` file in the root of the target project.

## 2. Key Technologies

- **Language**: TypeScript
- **Runtime**: Node.js
- **Package Manager**: pnpm (configured with workspaces for examples)
- **Core Engine**: TypeScript Compiler API for AST analysis.
- **Build Tool**: `tsup` for compiling TypeScript to both CJS and ESM modules.
- **CLI Framework**: `commander`
- **Unit Testing**: `vitest`
- **Integration Testing**: `playwright`
- **Configuration Validation**: `zod`
- **Pattern Matching**: `minimatch` and `fast-glob`

## 3. Project Structure

- `src/cli/`: Entry point and `commander` setup.
- `src/core/`:
  - `config.ts`: Zod schema for `puffin.json`. Defines a central `modules` registry for named patterns.
  - `scanner.ts`: Discovers files and resolves named modules into absolute file sets.
  - `runner.ts`: Orchestrates rule execution with time-outs.
  - `reporter.ts`: Formats results into Console (stylish), JSON, or Markdown.
  - `graph.ts`: Analyzes module-level dependencies to generate Mermaid diagrams.
  - `bootstrap.ts`: High-level pipeline functions for loading config and running scans.
- `src/rules/`: Implementation of analysis rules. Each rule is a class implementing the `Rule` interface.
  - `module-boundaries.ts`: Enforces import rules between named modules.
  - `layer-violations.ts`: Ensures unidirectional dependency flow between layers.
  - `public-api-only.ts`: Prevents deep imports by enforcing barrel exports.
  - `circular-dependencies.ts`: Detects import cycles.
- `src/plugins/`: Vite and Next.js integrations.
- `src/utils/`: Shared logic for path resolution and import extraction.
- `tests/`: Unit tests (`*.test.ts`) and integration tests (`integration/`).

## 4. Development Workflow

- **Installation**: `pnpm install`
- **Building**: `pnpm build` (compiles to `dist/`)
- **Running Tests**:
  - `pnpm test` (Unit + Integration)
  - `pnpm test:unit`
  - `pnpm test:integration` (requires `pnpm build` first)
- **Development**: `pnpm dev` runs a watch loop that rebuilds and runs a test scan.

## 5. Architectural Conventions

- **Centralized Patterns**: Architecture is defined via a root `modules` registry in `puffin.json`. Rules reference these names (e.g., "features", "ui") instead of re-defining patterns.
- **Import Resolution**: The tool handles TypeScript path aliases (e.g. `@/*`) automatically via the `project.aliases` configuration.
- **Rule Implementation**: Rules receive a `ScanContext` which contains the full configuration and the resolved module map.
- **Visual Evidence**: Markdown reports automatically include an architectural dependency graph using Mermaid syntax, highlighting violations with red dashed lines.
- **Immutability**: Rules are strictly read-only and must never modify the source code.
- **Error Handling**: The CLI exits with code 1 if any `error` level violations are found, and code 0 otherwise.

## 6. Testing Strategy

- **Unit Testing**: Focused on rule logic and utility functions. Uses `vitest`.
- **Integration Testing**: Uses `playwright` to run the compiled CLI against fixture projects in `tests/integration/fixtures/`. This verifies the end-to-end behavior including config parsing, file discovery, and reporting.
- **Mocking**: Extensive use of `vi.mock` in unit tests to simulate complex file system states or import graphs.
