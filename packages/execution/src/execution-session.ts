import { type Result, err, ok } from '@helix/core';
import type { Clock } from '@helix/core';
import type { IdGenerator } from '@helix/core';
import {
  type Artifact,
  type ArtifactInput,
  type Checkpoint,
  type ExecutionSessionState,
} from './model.js';
import {
  type ExecutionError,
  SessionStateError,
  SessionValidationError,
  ToolPermissionError,
} from './errors.js';

/** Ports required to run a session deterministically. */
export interface SessionDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

/** Options for starting a session. */
export interface StartOptions {
  /** Tools the agent is permitted to use (deny-by-default: empty permits none). */
  readonly allowedTools?: readonly string[];
}

/**
 * A single agent execution session. It enforces deny-by-default tool
 * permissions (Constitution Article 8), captures artifacts, supports explicit
 * checkpointing and resume, and can be cancelled. Terminal states reject further
 * work, so partial progress is never mistaken for success (Article 7).
 */
export class ExecutionSession {
  readonly #id: string;
  #status: ExecutionSessionState;
  readonly #allowedTools: Set<string>;
  readonly #usedTools: string[];
  readonly #artifacts: Artifact[];

  private constructor(
    id: string,
    status: ExecutionSessionState,
    allowedTools: Iterable<string>,
    usedTools: Iterable<string>,
    artifacts: Iterable<Artifact>,
  ) {
    this.#id = id;
    this.#status = status;
    this.#allowedTools = new Set(allowedTools);
    this.#usedTools = [...usedTools];
    this.#artifacts = [...artifacts];
  }

  get id(): string {
    return this.#id;
  }
  get status(): ExecutionSessionState {
    return this.#status;
  }
  get allowedTools(): readonly string[] {
    return [...this.#allowedTools].sort((a, b) => a.localeCompare(b));
  }
  get usedTools(): readonly string[] {
    return [...this.#usedTools];
  }
  get artifacts(): readonly Artifact[] {
    return [...this.#artifacts];
  }

  /** Start a new running session. */
  static start(
    id: string,
    options: StartOptions = {},
  ): Result<ExecutionSession, ExecutionError> {
    if (id.trim() === '') {
      return err(new SessionValidationError('session id must be non-empty'));
    }
    return ok(new ExecutionSession(id, 'running', options.allowedTools ?? [], [], []));
  }

  /** Authorize a tool without recording usage (deny-by-default). */
  authorizeTool(tool: string): Result<void, ExecutionError> {
    if (this.#status !== 'running') {
      return err(new SessionStateError(`session ${this.#id} is ${this.#status}`));
    }
    if (!this.#allowedTools.has(tool)) {
      return err(new ToolPermissionError(tool));
    }
    return ok(undefined);
  }

  /** Authorize and record use of a tool. */
  invokeTool(tool: string): Result<void, ExecutionError> {
    const authorized = this.authorizeTool(tool);
    if (!authorized.ok) {
      return authorized;
    }
    this.#usedTools.push(tool);
    return ok(undefined);
  }

  /** Capture an artifact produced during the session. */
  captureArtifact(
    input: ArtifactInput,
    deps: SessionDependencies,
  ): Result<Artifact, ExecutionError> {
    if (this.#status !== 'running') {
      return err(new SessionStateError(`session ${this.#id} is ${this.#status}`));
    }
    if (input.name.trim() === '' || input.kind.trim() === '') {
      return err(new SessionValidationError('artifact name and kind must be non-empty'));
    }
    const artifact: Artifact = { id: deps.ids.next(), name: input.name, kind: input.kind };
    this.#artifacts.push(artifact);
    return ok(artifact);
  }

  /** Capture a checkpoint of the current session state. */
  checkpoint(label: string, deps: SessionDependencies): Result<Checkpoint, ExecutionError> {
    if (this.#status !== 'running') {
      return err(new SessionStateError(`session ${this.#id} is ${this.#status}`));
    }
    return ok({
      id: deps.ids.next(),
      sessionId: this.#id,
      label,
      createdAt: deps.clock.now(),
      status: this.#status,
      allowedTools: this.allowedTools,
      usedTools: this.usedTools,
      artifacts: this.artifacts,
    });
  }

  /** Cancel a running session, recording the reason. */
  cancel(reason: string): Result<void, ExecutionError> {
    if (reason.trim() === '') {
      return err(new SessionValidationError('a cancellation reason is required'));
    }
    return this.#terminate('cancelled');
  }

  /** Complete a running session successfully. */
  complete(): Result<void, ExecutionError> {
    return this.#terminate('completed');
  }

  /** Fail a running session. */
  fail(): Result<void, ExecutionError> {
    return this.#terminate('failed');
  }

  #terminate(to: ExecutionSessionState): Result<void, ExecutionError> {
    if (this.#status !== 'running') {
      return err(new SessionStateError(`session ${this.#id} is already ${this.#status}`));
    }
    this.#status = to;
    return ok(undefined);
  }

  /** Restore a session from a checkpoint, resuming at its captured state. */
  static restore(checkpoint: Checkpoint): ExecutionSession {
    return new ExecutionSession(
      checkpoint.sessionId,
      checkpoint.status,
      checkpoint.allowedTools,
      checkpoint.usedTools,
      checkpoint.artifacts,
    );
  }
}
