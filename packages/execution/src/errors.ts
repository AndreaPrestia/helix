import { DomainError } from '@helix/core';

/** Base class for agent-runtime failures. */
export abstract class ExecutionError extends DomainError {}

/** Raised when an operation is attempted in an incompatible session state. */
export class SessionStateError extends ExecutionError {
  readonly code = 'SESSION_STATE_ERROR';
}

/** Raised when an agent requests a tool it is not permitted to use. */
export class ToolPermissionError extends ExecutionError {
  readonly code = 'TOOL_PERMISSION_DENIED';

  constructor(readonly tool: string) {
    super(`tool not permitted: ${tool}`);
  }
}

/** Raised when session input is invalid. */
export class SessionValidationError extends ExecutionError {
  readonly code = 'SESSION_VALIDATION_ERROR';
}
