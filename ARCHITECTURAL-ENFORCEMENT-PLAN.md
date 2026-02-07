# CodePuffin: Architectural Enforcement Plan

> **Mission:** Enforce your architecture, not just your code style.
>
> ESLint catches bad code. TypeScript catches bad types. CodePuffin catches bad architecture.

---

## Core Principle

| Tool | Level | Focus |
|------|-------|-------|
| ESLint | File | Code patterns |
| TypeScript | Type | Type safety |
| **CodePuffin** | **Module graph** | **Architectural rules** |

CodePuffin operates at the **module graph level** - understanding relationships between groups of files, not just individual files.

---

## Rule Categories

### Category 1: Import Boundaries

Rules that control **who can import whom**.

#### 1.1 `module-boundaries`
Control imports between defined modules/features.

```json
{
  "rules": {
    "module-boundaries": {
      "severity": "error",
      "modules": {
        "@features": "src/features/*",
        "@shared": "src/shared/*",
        "@core": "src/core/*"
      },
      "rules": [
        { "from": "@features", "to": "@features", "allow": false, "message": "Features cannot import other features" },
        { "from": "@features", "to": "@shared", "allow": true },
        { "from": "@features", "to": "@core", "allow": true },
        { "from": "@shared", "to": "@features", "allow": false, "message": "Shared code cannot depend on features" }
      ]
    }
  }
}
```

**Violations caught:**
- Feature A importing from Feature B
- Shared utilities importing feature-specific code
- Circular module dependencies

**Priority:** High
**Complexity:** Medium

---

#### 1.2 `layer-violations`
Enforce layered/clean architecture with directional dependencies.

```json
{
  "rules": {
    "layer-violations": {
      "severity": "error",
      "layers": [
        { "name": "ui", "pattern": "src/components/**" },
        { "name": "application", "pattern": "src/services/**" },
        { "name": "domain", "pattern": "src/domain/**" },
        { "name": "infrastructure", "pattern": "src/infrastructure/**" }
      ],
      "direction": "top-down",
      "allowed": [
        { "from": "ui", "to": ["application", "domain"] },
        { "from": "application", "to": ["domain"] },
        { "from": "infrastructure", "to": ["domain"] }
      ]
    }
  }
}
```

**Violations caught:**
- Domain layer importing UI components
- Infrastructure leaking into application layer
- Skipping layers (UI directly importing infrastructure)

**Priority:** High
**Complexity:** Medium

---

#### 1.3 `public-api-only`
Force imports through barrel exports (index.ts), no deep imports.

```json
{
  "rules": {
    "public-api-only": {
      "severity": "error",
      "modules": ["src/features/*", "src/shared/*"],
      "exceptions": ["*.test.ts", "*.spec.ts"]
    }
  }
}
```

**Allowed:**
```typescript
import { AuthService } from '@/features/auth';
```

**Violation:**
```typescript
import { hashPassword } from '@/features/auth/utils/crypto';
```

**Priority:** Medium
**Complexity:** Low

---

#### 1.4 `circular-dependencies` (Existing - Keep & Enhance)
Detect circular import chains.

```json
{
  "rules": {
    "circular-dependencies": {
      "severity": "error",
      "maxDepth": 10,
      "ignorePaths": ["**/*.test.ts"]
    }
  }
}
```

**Enhancements:**
- Show the full cycle path in error message
- Add `maxDepth` to limit detection depth
- Add path exclusions

**Priority:** Already implemented
**Complexity:** Already done

---

### Category 2: Structure Enforcement

Rules that enforce **folder and file structure**.

#### 2.1 `feature-structure`
Enforce consistent structure within feature folders.

```json
{
  "rules": {
    "feature-structure": {
      "severity": "error",
      "pattern": "src/features/*",
      "structure": {
        "required": ["index.ts"],
        "optional": ["types.ts", "hooks/", "components/", "utils/", "api/"],
        "forbidden": ["*.test.ts", "*.spec.ts", "__tests__/"]
      }
    }
  }
}
```

**Violations caught:**
- Feature missing index.ts (public API)
- Tests inside feature folder (if forbidden)
- Unexpected files/folders in feature

**Priority:** Medium
**Complexity:** Low

---

#### 2.2 `folder-boundaries`
Restrict what file types can exist in certain folders.

```json
{
  "rules": {
    "folder-boundaries": {
      "severity": "error",
      "boundaries": [
        { "path": "src/components/**", "allow": ["*.tsx", "*.css", "index.ts"] },
        { "path": "src/hooks/**", "allow": ["use*.ts", "index.ts"] },
        { "path": "src/types/**", "allow": ["*.ts"], "forbid": ["*.tsx"] }
      ]
    }
  }
}
```

**Priority:** Low
**Complexity:** Low

---

### Category 3: Side Effect Boundaries

Rules that enforce **where certain operations can occur**.

#### 3.1 `io-boundaries`
Restrict I/O operations to specific modules.

```json
{
  "rules": {
    "io-boundaries": {
      "severity": "error",
      "boundaries": {
        "fetch": {
          "allowedIn": ["src/api/**", "src/infrastructure/http/**"],
          "message": "HTTP calls must go through the API layer"
        },
        "localStorage": {
          "allowedIn": ["src/infrastructure/storage/**"],
          "message": "Storage access must go through storage infrastructure"
        },
        "console": {
          "allowedIn": ["src/infrastructure/logger/**"],
          "message": "Use the logger service instead of console"
        }
      }
    }
  }
}
```

**Detection method:** AST analysis for:
- `fetch(`, `axios.`, `ky.`
- `localStorage.`, `sessionStorage.`
- `console.log`, `console.error`, etc.

**Priority:** Medium
**Complexity:** Medium (requires AST patterns)

---

#### 3.2 `no-direct-service-import`
Enforce dependency injection patterns.

```json
{
  "rules": {
    "no-direct-service-import": {
      "severity": "error",
      "services": ["src/services/*"],
      "allowedConsumers": [
        "src/di/container.ts",
        "src/providers/**",
        "**/*.test.ts"
      ],
      "message": "Services must be injected via DI container, not imported directly"
    }
  }
}
```

**Priority:** Low
**Complexity:** Low

---

### Category 4: Framework-Specific Rules

#### 4.1 `server-client-boundary` (Next.js App Router)
Prevent server-only code from being imported in client components.

```json
{
  "rules": {
    "server-client-boundary": {
      "severity": "error",
      "serverOnly": [
        "src/db/**",
        "src/server/**",
        "**/*.server.ts"
      ],
      "clientOnly": [
        "src/hooks/**",
        "src/stores/**",
        "**/*.client.ts"
      ],
      "clientComponents": ["**/components/**/*.tsx"]
    }
  }
}
```

**Violations caught:**
- Client component importing database code
- Server action importing client-side hooks
- Mixing server/client concerns

**Priority:** High (for Next.js users)
**Complexity:** Medium

---

#### 4.2 `react-component-boundaries`
Enforce React-specific architectural patterns.

```json
{
  "rules": {
    "react-component-boundaries": {
      "severity": "warn",
      "rules": [
        {
          "name": "no-business-logic-in-components",
          "pattern": "src/components/**/*.tsx",
          "forbidImportsFrom": ["src/services/**", "src/api/**"]
        },
        {
          "name": "hooks-only-import-hooks",
          "pattern": "src/hooks/**",
          "allowImportsFrom": ["src/hooks/**", "src/utils/**", "src/types/**"]
        }
      ]
    }
  }
}
```

**Priority:** Medium
**Complexity:** Medium

---

### Category 5: Monorepo Rules

#### 5.1 `package-boundaries`
Control dependencies between packages in a monorepo.

```json
{
  "rules": {
    "package-boundaries": {
      "severity": "error",
      "packages": {
        "@myorg/ui": {
          "canImport": ["@myorg/utils", "@myorg/types"],
          "cannotImport": ["@myorg/api", "@myorg/db"]
        },
        "@myorg/api": {
          "canImport": ["@myorg/utils", "@myorg/types", "@myorg/db"]
        },
        "apps/*": {
          "canImport": ["@myorg/*"]
        }
      }
    }
  }
}
```

**Priority:** Medium (for monorepo users)
**Complexity:** Medium (needs package.json awareness)

---

### Category 6: Visualization

#### 6.1 `puffin graph` Command
Generate visual dependency graphs.

```bash
# Output module dependency graph
puffin graph --output architecture.svg

# Focus on specific module
puffin graph --focus src/features/auth --depth 2

# Show violations only
puffin graph --violations-only --output violations.svg
```

**Output formats:**
- SVG (default)
- Mermaid markdown
- DOT (Graphviz)
- JSON (for custom tooling)

**Priority:** Low (nice-to-have)
**Complexity:** Medium

---

## Implementation Phases

### Phase 1: Foundation (Current + Immediate)
**Goal:** Remove overlap, solidify core

| Task | Status |
|------|--------|
| Remove `line-limits` | Pending |
| Remove `naming-convention` | Pending |
| Remove `dead-code` | Pending |
| Remove `complexity` | Pending |
| Keep `circular-dependencies` | Done |
| Update tests to use remaining rules | Pending |

**Timeline:** 1-2 days

---

### Phase 2: Core Boundary Rules
**Goal:** The "killer features" that differentiate CodePuffin

| Rule | Priority | Complexity | Order |
|------|----------|------------|-------|
| `module-boundaries` | High | Medium | 1st |
| `layer-violations` | High | Medium | 2nd |
| `public-api-only` | Medium | Low | 3rd |

**Timeline:** 1-2 weeks

---

### Phase 3: Structure & Side Effects
**Goal:** Expand architectural coverage

| Rule | Priority | Complexity | Order |
|------|----------|------------|-------|
| `feature-structure` | Medium | Low | 1st |
| `io-boundaries` | Medium | Medium | 2nd |
| `no-direct-service-import` | Low | Low | 3rd |

**Timeline:** 1-2 weeks

---

### Phase 4: Framework & Ecosystem
**Goal:** Framework-specific value

| Rule | Priority | Complexity | Order |
|------|----------|------------|-------|
| `server-client-boundary` | High | Medium | 1st |
| `package-boundaries` | Medium | Medium | 2nd |
| `react-component-boundaries` | Medium | Medium | 3rd |

**Timeline:** 2-3 weeks

---

### Phase 5: Visualization & Polish
**Goal:** Developer experience

| Feature | Priority | Order |
|---------|----------|-------|
| `puffin graph` command | Low | 1st |
| Better error messages with fix suggestions | Medium | 2nd |
| VS Code extension (squiggly lines) | Low | Future |

**Timeline:** Ongoing

---

## Success Metrics

1. **Zero overlap** with ESLint/TypeScript
2. **Clear positioning** as "architectural linter"
3. **5+ rules** in the module-graph category
4. **Framework presets** for Next.js, React, monorepos
5. **Docs** that clearly explain "why CodePuffin vs ESLint"

---

## Config Presets (Future)

```bash
# Initialize with a preset
puffin init --preset nextjs
puffin init --preset clean-architecture
puffin init --preset monorepo
```

**Presets ship with:**
- Sensible default rules for that architecture
- Example config with comments
- Documentation links

---

## Tagline Options

- "Enforce your architecture, not just your code style"
- "Deterministic architectural enforcement for TypeScript"
- "The architectural guard for modern TypeScript projects"
- "Because AI suggestions aren't guarantees"
