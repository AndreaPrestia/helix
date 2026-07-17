/** The lifecycle states of an execution session. */
export const executionSessionStates = ['running', 'completed', 'cancelled', 'failed'] as const;
export type ExecutionSessionState = (typeof executionSessionStates)[number];

/** An artifact captured during an execution session. */
export interface Artifact {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
}

/** Input for capturing an artifact (its id is assigned by the session). */
export interface ArtifactInput {
  readonly name: string;
  readonly kind: string;
}

/**
 * An immutable checkpoint of a session's state, sufficient to resume it. Because
 * a session's progress is captured explicitly, a run can be paused and restored
 * deterministically.
 */
export interface Checkpoint {
  readonly id: string;
  readonly sessionId: string;
  readonly label: string;
  readonly createdAt: Date;
  readonly status: ExecutionSessionState;
  readonly allowedTools: readonly string[];
  readonly usedTools: readonly string[];
  readonly artifacts: readonly Artifact[];
}
