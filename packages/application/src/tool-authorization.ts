import { type Result, err, ok } from '@helix/core';
import { ToolAuthorizationError } from './errors.js';

/** A request to invoke a named tool on behalf of a principal. */
export interface ToolRequest {
  readonly tool: string;
  readonly principal: string;
}

/** A grant record produced by a successful authorization. */
export interface ToolGrant {
  readonly tool: string;
  readonly principal: string;
}

/**
 * Authorizes tool invocations deny-by-default against an explicit allowlist of
 * granted tool names. A tool that is not on the allowlist is refused with a
 * typed error; nothing is authorized implicitly (Constitution Article 8).
 */
export class ToolAuthorizer {
  readonly #granted: ReadonlySet<string>;

  constructor(grantedTools: Iterable<string>) {
    this.#granted = new Set(grantedTools);
  }

  /** The granted tool names, sorted. */
  grantedTools(): readonly string[] {
    return [...this.#granted].sort((a, b) => a.localeCompare(b));
  }

  /** Whether a tool is authorized. */
  isAuthorized(tool: string): boolean {
    return this.#granted.has(tool);
  }

  /** Authorize a tool request, or fail with a typed error. */
  authorize(request: ToolRequest): Result<ToolGrant, ToolAuthorizationError> {
    if (!this.#granted.has(request.tool)) {
      return err(new ToolAuthorizationError(request.tool));
    }
    return ok({ tool: request.tool, principal: request.principal });
  }
}
