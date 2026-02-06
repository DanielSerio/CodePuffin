# CodePuffin 🐧

> **The Architectural Integrity Engine for the Agentic Era.**

## What is CodePuffin?

**CodePuffin** is a high-performance static analysis engine designed to bridge the gap between human architectural vision and AI-driven code generation. While AI agents are domesticating the world of coding, CodePuffin ensures they stay within the boundaries of your design.

By leveraging the **TypeScript Compiler API**, CodePuffin provides deep, deterministic, and near-instant feedback on your project's modular health without the overhead of external APIs or "black-box" LLM analysis.

### 🌟 Why CodePuffin?

- **🤖 Agent-Optimized**: Generates markdown reports specifically structured as "missions" for AI coding assistants, enabling autonomous refactoring pipelines.
- **🚀 Blazing Fast**: Near-instant AST analysis. It's not just a linter; it's a real-time architectural guardrail that runs at the speed of thought.
- **🔒 Privacy-First by Design**: 100% local. Your intellectual property never leaves your machine, making it the secure choice for high-stakes enterprise projects.
- **🏗️ Architecturally Aware**: Move beyond simple linting. Enforce modular boundaries and layer-specific standards (UI vs. Data Layer) that traditional tools ignore.
- **✅ Zero-Cost Determinism**: No tokens, no hallucinations, no subscriptions. Just pure, reproducible logic that ensures your codebase remains a masterpiece.

### 🔮 Built for 2026 and Beyond

In a world where code is increasingly machine-generated, **architectural drift** is the new technical debt. CodePuffin is the "source of truth" that empowers human architects to lead teams of AI agents with confidence, ensuring that every file adheres to the core principles of SOLID and clean design.

### 🛠️ Core Capabilities

- **Zero-Waste Analysis**: Deep dead-code detection that identifies unused exports and variables across complex module trees.
- **Structural Integrity**: Custom naming conventions and file structures tailored to your project's specific layers.
- **Cognitive Guardrails**: Advanced complexity monitoring (Cyclomatic & Cognitive) to keep your logic human-readable and agent-maintainable.
- **Enterprise Integration**: First-class support for Vite, Next.js, and CLI-driven CI/CD pipelines.

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
        "@contexts": { "functions": "useCamelCase" }
      }
    }
  },
  "output": {
    "format": "markdown",
    "reportFile": "./reports/puffin-report.md"
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

## Features

### 📏 Rules

- **Modular Line Limits**: Enforce strict file length boundaries with per-module overrides (e.g., higher limits for `@constants`).
- **Deep Dead Code**: Trace export chains to find truly unused code that standard linters miss.
- **Naming Enforcement**: Precision case-style control for files, variables, functions, and classes.
- **Logic Complexity**: Quantitative metrics for cyclomatic and cognitive complexity with smart thresholds.
- **Circular Insight**: Graph-based analysis to detect and visualize import cycles.

### 📊 Reporting Ecosystem

- **Stylish Console**: Real-time, color-coded terminal feedback for local development.
- **Actionable JSON**: Structured data for integration into custom dashboarding or security tools.
- **Agent-Ready Markdown**: High-fidelity reports designed to be fed back into AI coding agents for immediate resolution.

### Integrations

- **CLI**: Standalone scanning via `puffin scan`
- **Vite Plugin**: Runs on build and dev server reload
- **Next.js Plugin**: Runs during development and CI
