/**
 * `@helix/governance` — the OpenSpec governance engine.
 *
 * Discovers baseline specifications and active changes, validates change
 * structure, applies deltas, and archives accepted changes. All I/O is behind
 * the {@link OpenSpecFileStore} port; parsing and merging are pure and
 * deterministic. Depends only on the provider-agnostic `@helix/core`.
 */

export type {
  SpecRequirement,
  BaselineSpec,
  DeltaOperation,
  DeltaRequirement,
  DeltaSpec,
  ChangeManifest,
  ChangeStructure,
  ArchiveOutcome,
} from './model.js';

export {
  GovernanceError,
  ParseError,
  ChangeValidationError,
  DeltaConflictError,
} from './errors.js';

export { parseSpec } from './parse-spec.js';
export { parseDelta } from './parse-delta.js';
export { parseChangeManifest } from './parse-manifest.js';

export type { OpenSpecFileStore } from './file-store.js';
export { InMemoryFileStore } from './in-memory-file-store.js';
export { FileSystemFileStore } from './filesystem-file-store.js';

export { OpenSpecEngine } from './engine.js';
export { validateChangeStructure } from './validate.js';
export { applyDelta, archiveChange } from './apply.js';
