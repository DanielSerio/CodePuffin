# CodePuffin 🐧

**CodePuffin** is a lightweight, high-performance static analysis tool designed to enforce architectural integrity and code quality without the overhead of AI or external API dependencies.

- **✅ Deterministic**: Consistent, reproducible results every time. No hallucinations, no tokens, no cost.

Unlike traditional linters or AI-driven assistants, CodePuffin focuses on **Architectural Enforcement**—ensuring that your project's modular boundaries, naming conventions, and complexity limits are strictly maintained across the entire codebase.

### Why CodePuffin?

- **🚀 Blazing Fast**: Built on the TypeScript Compiler API for deep AST analysis with near-instant execution.
- **🔒 Privacy First**: Performs 100% local static analysis. Your code never leaves your machine.
- **🏗️ Architecturally Aware**: Groups rules by project modules (UI, Hooks, Data Layer) to enforce different standards for different layers.
- **✅ Deterministic**: Consistent, reproducible results every time. No hallucinations, no tokens, no cost.

### Core Capabilities

- **Dead Code Detection**: Identify unused exports and variables across complex module trees.
- **Architectural Guardrails**: Enforce naming conventions and file structures specific to your project's layers.
- **Complexity Management**: Monitor line limits and cognitive complexity to prevent technical debt.
- **Ecosystem Ready**: Seamlessly integrates into your build pipeline via CLI or framework-specific plugins.

## interface

CodePuffin has two interfaces:

- CLI
- Framework plugins (Vite Plugin, Next.js Plugin, etc)

### CLI

```bash
# scan current directory
puffin scan

# scan with custom config
puffin scan --config /path/to/config.json
```

### Framework plugins

### Vite Plugin

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import codePuffin from 'codepuffin/vite';

export default defineConfig({
  plugins: [
    codePuffin({
      // options
    }),
  ],
});
```

## Configuration

CodePuffin uses a configuration file (`puffin.json`) to determine which rules to apply and how to apply them.

```json
{
  "project": {
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.test.*", "src/components/ui/**/*"]
  },
  "modules": {
    "ui": "src/components/ui/**/*",
    "components": "src/components/**/*",
    "hooks": "src/hooks/**/*",
    "constants": "src/constants/**/*",
    "contexts": "src/contexts/**/*",
    "data-layer": "src/{repositories,services,schemas,stores}/**/*"
  },
  "rules": {
    "dead-code": {
      "severity": "error",
      "exclude": ["@ui"],
      "unusedExports": true,
      "unusedVariables": true
    },
    "line-limits": {
      "severity": "warn",
      "default": 100,
      "overrides": {
        "@constants": 200,
        "@contexts": 150
      }
    },
    "naming-convention": {
      "severity": "warn",
      "files": "kebab-case",
      "variables": "camelCase",
      "functions": "camelCase",
      "classes": "PascalCase",
      "overrides": {
        "@components": { "files": "PascalCase" },
        "@hooks": { "functions": "useCamelCase" },
        "@constants": { "variables": "UPPER_SNAKE_CASE" },
        "@contexts": { "functions": "usePascalCase" }
      }
    }
  },
  "output": {
    "format": "markdown",
    "reportFile": "./reports/[timestamp]-scan-results.md"
  }
}
```

## File Structure

```text
.
├── src/                 # Source code
│   ├── cli/             # CLI entry points and command logic
│   ├── core/            # Scanning engine and file system traversal
│   ├── rules/           # Implementation of scanning rules
│   ├── plugins/         # Framework integrations (Vite, Next.js, etc.)
│   └── utils/           # Shared internal utilities
├── examples/            # Example apps for testing and development
│   ├── basic/           # Simple vanilla TS project
│   ├── nextjs-app/      # Next.js framework integration test app
│   └── react-app/       # Vite/React framework integration test app
├── tests/               # Unit and integration tests
├── package.json         # Project metadata and dependencies
└── README.md            # Documentation
```

## Development Stack

- **Runtime**: Node.js >= 18
- **Language**: TypeScript
- **Package Manager**: pnpm (Workspaces enabled for `/examples`)
- **Build Tool**: tsup (esbuild-based)
- **Testing**: Vitest (Unit) & Playwright (Integration)
- **Core Library**: TypeScript Compiler API

## Roadmap

### Phase 1: Foundation

- [x] Initialize PNPM workspace and project structure
- [x] Implement CLI boilerplate (Commander.js)
- [x] Basic configuration loader (`puffin.json`)
- [x] File system traversal with `@module` alias support

### Phase 2: Core Rules

- [x] **Line Limits**: Support for default and override limits
- [x] **Dead Code**: Identify unused variables and exports
- [x] **Naming Conventions**: Enforce case styles for variables, functions, and classes

### Phase 3: Ecosystem

- [x] Vite Plugin implementation
- [x] Next.js integration
- [x] GitHub Action for PR scanning

### Phase 4: Advanced Analysis

- [ ] **Complexity**: Calculate cyclomatic and cognitive complexity
- [ ] **Circular Dependencies**: Detect imports that loop back
- [ ] **Reporting**: Export results to Markdown and JSON
