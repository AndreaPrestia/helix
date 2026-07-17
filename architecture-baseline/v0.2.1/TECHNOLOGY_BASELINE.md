# Technology Baseline

| Concern | Frozen choice |
|---|---|
| Language | TypeScript 5.x |
| Runtime | Node.js 22 LTS |
| Modules | Native ESM |
| Package manager | pnpm |
| Monorepo | Turborepo |
| Build | tsup |
| Test | Vitest |
| Lint | ESLint flat config |
| Format | Prettier |
| CI | GitHub Actions |
| Containers | Docker |

Compiler settings MUST include strictness appropriate to the repository baseline, including `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, and `verbatimModuleSyntax` where compatible.
