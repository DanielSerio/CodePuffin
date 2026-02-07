# CodePuffin 🐧

> **Enforce your architecture, not just your code style.**

## What is CodePuffin?

**CodePuffin** is a high-performance architectural enforcement engine for TypeScript projects.

In the agentic era, code generation is fast, but architectural drift is faster. While ESLint catches bad code patterns and TypeScript ensures type safety, CodePuffin operates at the **module graph level** to ensure your codebase stays within the boundaries of your intended design.

By leveraging the **TypeScript Compiler API**, CodePuffin provides deep, deterministic, and near-instant feedback on your project's modular health.

### 🌟 Why CodePuffin?

- **🏗️ Architecturally Aware**: Move beyond simple linting. Enforce modular boundaries, layer-specific standards (UI vs. Data Layer), and Public API surfaces that traditional tools ignore.
- **🤖 Agent-Optimized**: Generates high-fidelity markdown reports specifically structured for AI coding assistants, enabling autonomous architectural compliance.
- **🚀 Blazing Fast**: Near-instant AST analysis with incremental scanning — only changed files and their dependents are re-analyzed.
- **🔒 Privacy-First**: 100% local. Your intellectual property never leaves your machine. No tokens, no hallucinations, just pure logic.

---

## 📐 Core Principles

| Tool           | Level     | Focus                       |
| -------------- | --------- | --------------------------- |
| ESLint         | File      | Code patterns & Style       |
| TypeScript     | Type      | Type safety & correctness   |
| **CodePuffin** | **Graph** | **Architectural integrity** |

---

## 🛠️ Core Capabilities

- **Import Boundaries**: Control which modules are allowed to talk to each other (e.g., Features cannot import from other Features).
- **Layer Violations**: Enforce Clean/Layered architecture by ensuring dependencies only flow in one direction.
- **Public API Enforcement**: Force imports through barrel exports (`index.ts`), preventing deep, brittle imports into internal module structures.
- **Cycle Detection**: Advanced graph analysis to detect and visualize circular dependencies that lead to tight coupling.

## Interface

CodePuffin has two primary interfaces:

- **CLI**: Standardized scanning for local development and CI/CD pipelines.
- **Framework Plugins**: Real-time feedback integrated into Vite, Next.js, and more.

### CLI

```bash
# scan current directory
puffin scan

# scan with custom config
puffin scan --config puffin.json

# force a full re-scan (ignore cached results)
puffin scan --clean
```

### Framework Plugins

#### Vite Plugin

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

CodePuffin uses `puffin.json` to define your architectural manifest. All named patterns (modules, layers, areas) are centralized in the root `modules` registry.

```json
{
  "project": {
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.test.*"],
    "aliases": { "@/*": "src/*" }
  },
  "modules": {
    "app": "src/app/**/*",
    "features": "src/features/*",
    "ui": "src/components/**/*",
    "domain": "src/domain/**",
    "infra": "src/infrastructure/**"
  },
  "rules": {
    "module-boundaries": {
      "severity": "error",
      "rules": [
        {
          "importer": "features",
          "imports": "features",
          "allow": false,
          "message": "Features cannot import other features directly"
        },
        { "importer": "features", "imports": "app", "allow": false }
      ]
    },
    "layer-violations": {
      "severity": "error",
      "allowed": [
        { "importer": "ui", "imports": ["domain"] },
        { "importer": "infra", "imports": ["domain"] }
      ]
    },
    "public-api-only": {
      "severity": "error",
      "modules": ["features"],
      "exceptions": ["**/*.test.ts"]
    },
    "circular-dependencies": {
      "severity": "error",
      "maxDepth": 10
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
│   ├── core/            # Scanning engine and module resolution
│   ├── rules/           # Architectural rule implementations
│   ├── plugins/         # Framework integrations (Vite, Next.js, etc.)
│   └── utils/           # Shared internal utilities
├── examples/            # Example apps for testing
├── tests/               # Unit and integration tests
├── puffin.json          # Your architectural manifest
├── .puffin-cache.json   # Auto-generated incremental scan cache (add to .gitignore)
└── README.md            # You are here
```

## Development Stack

- **Runtime**: Node.js >= 18
- **Language**: TypeScript
- **Package Manager**: pnpm (Workspaces enabled for `/examples`)
- **Build Tool**: tsup (esbuild-based)
- **Testing**: Vitest (Unit) & Playwright (Integration)
- **Core Library**: TypeScript Compiler API

## Features

### 📐 Rules (Current)

- **Module Boundaries**: Prevent "spaghetti" dependencies between features.
- **Layered Integrity**: Enforce top-down dependency flow (Clean/Hexagonal).
- **Public API Guards**: Protect internal module implementation details.
- **Circular Insight**: Detect and break tight coupling cycles.

### Incremental Scanning

CodePuffin automatically caches scan results in `.puffin-cache.json` and only re-analyzes files that have changed since the last run. This reduces scan time from **O(N)** to **O(D + A)** (D = modified files, A = affected dependents).

- **Content hashing**: Files are skipped if their content hash hasn't changed (with mtime fast-path).
- **Blast radius**: When a file changes, its direct importers are automatically re-analyzed too.
- **Result merging**: Fresh results for dirty files are merged with cached results for clean files.
- **Config change detection**: Cached results are automatically invalidated when rule configuration changes in `puffin.json`.
- **`--clean` flag**: Force a full re-scan when needed.

### 📊 Reporting

- **Stylish Console**: Real-time terminal feedback.
- **🗺️ Architectural Visualization**: Automated Mermaid diagrams in Markdown reports (no AI required).
- **Agent-Ready Markdown**: Reports designed to be "missions" for AI coding agents.
- **Actionable JSON**: For custom CI/CD integrations.

### 🗺️ Roadmap

- **Feature Structure**: Enforce consistent internal folder layouts.
- **I/O Boundaries**: Restrict Side Effects (fetch, localStorage) to specific layers.
- **Puffin Graph**: Visual dependency graph generation (SVG/Mermaid).
- **Framework Presets**: One-click config for Next.js, React, and Monorepos.
