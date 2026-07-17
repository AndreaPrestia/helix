import { isErr } from '@helix/core';
import type { Daemon } from './daemon.js';

/** A request to the local daemon API. */
export type DaemonRequest =
  | { readonly type: 'status' }
  | { readonly type: 'openSession'; readonly workspaceRoot: string }
  | { readonly type: 'closeSession'; readonly sessionId: string }
  | { readonly type: 'listSessions' }
  | { readonly type: 'enqueueJob'; readonly sessionId: string; readonly kind: string }
  | { readonly type: 'claimJob' }
  | { readonly type: 'completeJob'; readonly jobId: string }
  | { readonly type: 'failJob'; readonly jobId: string; readonly reason: string }
  | { readonly type: 'cancelJob'; readonly jobId: string }
  | { readonly type: 'listJobs' }
  | { readonly type: 'shutdown' };

/** A response from the local daemon API. */
export type DaemonResponse =
  | { readonly ok: true; readonly result: unknown }
  | { readonly ok: false; readonly code: string; readonly message: string };

function success(result: unknown): DaemonResponse {
  return { ok: true, result };
}

function failure(code: string, message: string): DaemonResponse {
  return { ok: false, code, message };
}

/**
 * A transport-agnostic dispatcher for the local daemon API. It maps typed
 * requests onto {@link Daemon} operations and returns typed responses, turning
 * `Result`/`Option` outcomes into explicit success/failure payloads. Any error
 * surfaces its stable code — no failure is concealed (Constitution Article 7).
 */
export class LocalApi {
  readonly #daemon: Daemon;

  constructor(daemon: Daemon) {
    this.#daemon = daemon;
  }

  handle(request: DaemonRequest): DaemonResponse {
    switch (request.type) {
      case 'status':
        return success({ status: this.#daemon.status() });
      case 'openSession': {
        const result = this.#daemon.openSession(request.workspaceRoot);
        return isErr(result)
          ? failure(result.error.code, result.error.message)
          : success(result.value);
      }
      case 'closeSession': {
        const result = this.#daemon.closeSession(request.sessionId);
        return isErr(result)
          ? failure(result.error.code, result.error.message)
          : success(result.value);
      }
      case 'listSessions':
        return success(this.#daemon.listSessions());
      case 'enqueueJob': {
        const result = this.#daemon.enqueueJob(request.sessionId, request.kind);
        return isErr(result)
          ? failure(result.error.code, result.error.message)
          : success(result.value);
      }
      case 'claimJob': {
        const claimed = this.#daemon.claimJob();
        return success(claimed.some ? claimed.value : null);
      }
      case 'completeJob': {
        const result = this.#daemon.completeJob(request.jobId);
        return isErr(result)
          ? failure(result.error.code, result.error.message)
          : success(result.value);
      }
      case 'failJob': {
        const result = this.#daemon.failJob(request.jobId, request.reason);
        return isErr(result)
          ? failure(result.error.code, result.error.message)
          : success(result.value);
      }
      case 'cancelJob': {
        const result = this.#daemon.cancelJob(request.jobId);
        return isErr(result)
          ? failure(result.error.code, result.error.message)
          : success(result.value);
      }
      case 'listJobs':
        return success(this.#daemon.listJobs());
      case 'shutdown':
        return success(this.#daemon.shutdown());
    }
  }
}
