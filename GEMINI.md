# Gemini Context: CodePuffin Static Analysis Tool

This document provides instructional context for interacting with the `CodePuffin` codebase.

## 1. Project Overview

`CodePuffin` is a high-performance, local-first static analysis tool for TypeScript projects. It is designed to enforce architectural integrity and code quality rules without relying on external APIs or AI services. Its core purpose is to be a deterministic and fast checker for rules that go beyond standard linting, such as dead code detection, complexity analysis, and project-specific naming conventions.

The tool operates via two main interfaces:
1.  A Command-Line Interface (CLI) invoked with the `puffin` command.
2.  Plugins for popular build tools like Vite and Next.js.

Configuration is managed through a `puffin.json` file in the root of the target project.

## 2. Key Technologies

- **Language**: TypeScript
- **Runtime**: Node.js
- **Package Manager**: pnpm (configured with workspaces)
- **Core Engine**: TypeScript Compiler API for Abstract Syntax Tree (AST) analysis.
- **Build Tool**: `tsup` for compiling TypeScript to both CJS and ESM modules.
- **CLI Framework**: `commander`
- **Unit Testing**: `vitest`
- **Integration Testing**: `playwright`
- **Configuration Validation**: `zod`

## 3. Project Structure

The codebase is organized into a `src` directory with a clear separation of concerns:

- `src/cli/`: Contains the entry point and logic for the command-line interface.
- `src/core/`: Implements the main scanning engine (`scanner.ts`), configuration loading (`config.ts`), and reporting (`reporter.ts`). The scanner is responsible for traversing the file system based on `puffin.json` and orchestrating the execution of rules.
- `src/rules/`: Contains the implementation for each analysis rule (e.g., `dead-code.ts`, `line-limits.ts`). Each rule is a class that implements the `Rule` interface.
- `src/plugins/`: Provides integrations for external tools like Vite (`vite.ts`) and Next.js (`next.ts`).
- `src/utils/`: A collection of shared utility functions.
- `tests/`: Contains all tests.
  - `tests/integration/`: End-to-end tests for the CLI and plugins, run using Playwright. These tests typically execute the compiled CLI against fixture projects.
  - All other `*.test.ts` files are unit tests run by Vitest.

## 4. Development Workflow

The project uses `pnpm` as its package manager.

- **Installation**:
  ```bash
  pnpm install
  ```

- **Building**:
  To compile the TypeScript source code into distributable JavaScript files in the `dist/` directory:
  ```bash
  pnpm build
  ```

- **Running Tests**:
  The test suite is divided into unit and integration tests.
  - **Run all tests**:
    ```bash
    pnpm test
    ```
  - **Run only unit tests**:
    ```bash
    pnpm test:unit
    ```
  - **Run only integration tests** (requires a prior build):
    ```bash
    pnpm test:integration
    ```

- **Development Mode**:
  To run the tool in watch mode, which automatically rebuilds and executes the scanner on file changes:
  ```bash
  pnpm dev
  ```

## 5. Architectural Conventions

- **Rule Implementation**: New rules should be created as `class` files within the `src/rules/` directory. Each rule must implement the `Rule` interface and have a unique `id`. The `run` method receives the `ScanContext` and is responsible for returning an array of `RuleResult` objects for any violations found.
- **AST Analysis**: The tool leverages the TypeScript Compiler API for parsing source code. Rules can traverse the AST to inspect code structure, identify patterns, and check for violations. The `dead-code.ts` rule is a good example of this pattern.
- **Configuration**: All configuration is driven by the `puffin.json` file, which is validated using a Zod schema defined in `src/core/config.ts`.
- **Immutability**: The scanner and rules should not modify the source files they are analyzing. They are designed for read-only analysis.
- **Testing**:
  - Any new rule or core logic should be accompanied by unit tests using `vitest`.
  - Changes to the CLI's behavior or output should be validated with an integration test in `tests/integration/` using `playwright`. Fixture projects in `tests/integration/fixtures/` are used to create specific scenarios for testing.
