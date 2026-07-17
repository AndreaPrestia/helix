/**
 * `@helix/execution` — the agent runtime.
 *
 * Manages agent execution sessions: deny-by-default tool permissions, artifact
 * capture, explicit checkpointing and resume, and cancellation (Constitution
 * Articles 3, 7, 8). Depends only on `@helix/core`.
 */

export {
  executionSessionStates,
  type ExecutionSessionState,
  type Artifact,
  type ArtifactInput,
  type Checkpoint,
} from './model.js';
export {
  ExecutionError,
  SessionStateError,
  ToolPermissionError,
  SessionValidationError,
} from './errors.js';
export {
  ExecutionSession,
  type SessionDependencies,
  type StartOptions,
} from './execution-session.js';
