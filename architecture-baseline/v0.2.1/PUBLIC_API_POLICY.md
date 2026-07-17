# Public API Policy

- Every package exposes its supported API from `src/index.ts` and package `exports`.
- Cross-package deep imports are forbidden.
- Internal symbols are not compatibility commitments.
- Public contracts use explicit types and do not leak adapter-specific implementations.
- Breaking public API changes require an accepted change, migration notes, and semantic-version impact analysis.
- Experimental APIs must be explicitly labeled and isolated.
