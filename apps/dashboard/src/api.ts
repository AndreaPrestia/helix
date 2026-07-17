import { type Option, isErr } from '@helix/core';
import type { Authenticator } from './auth.js';
import type { Dashboard } from './dashboard.js';
import { ReadOnlyError } from './errors.js';
import type { JobStatus } from './model.js';

/** A request to the dashboard API. Read requests are always allowed; write
 * requests are refused while the dashboard is in read-only mode. */
export type DashboardRequest =
  | { readonly type: 'summary' }
  | { readonly type: 'tasks'; readonly limit?: number }
  | { readonly type: 'runs'; readonly status?: JobStatus; readonly limit?: number }
  | { readonly type: 'failures'; readonly limit?: number }
  | { readonly type: 'task'; readonly id: string }
  | { readonly type: 'run'; readonly id: string }
  | { readonly type: 'cancelRun'; readonly id: string };

/** The set of request types that mutate daemon state. */
const WRITE_REQUESTS: ReadonlySet<DashboardRequest['type']> = new Set(['cancelRun']);

/** A response from the dashboard API. */
export type DashboardResponse =
  | { readonly ok: true; readonly result: unknown }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Options controlling the dashboard API. */
export interface DashboardApiOptions {
  /** Whether the dashboard refuses mutating requests. Defaults to `true`. */
  readonly readOnly?: boolean;
}

function success(result: unknown): DashboardResponse {
  return { ok: true, result };
}

function failure(code: string, message: string): DashboardResponse {
  return { ok: false, code, message };
}

/**
 * The dashboard's read-only API. Every request is authenticated first; an
 * absent or invalid token is rejected. In its initial read-only mode any
 * mutating request is refused with a clear `READ_ONLY` error before it can
 * reach the daemon (Constitution Articles 7 and 8).
 */
export class DashboardApi {
  readonly #dashboard: Dashboard;
  readonly #authenticator: Authenticator;
  readonly #readOnly: boolean;

  constructor(
    dashboard: Dashboard,
    authenticator: Authenticator,
    options: DashboardApiOptions = {},
  ) {
    this.#dashboard = dashboard;
    this.#authenticator = authenticator;
    this.#readOnly = options.readOnly ?? true;
  }

  handle(request: DashboardRequest, token: Option<string>): DashboardResponse {
    const auth = this.#authenticator.authenticate(token);
    if (isErr(auth)) {
      return failure(auth.error.code, auth.error.message);
    }

    if (this.#readOnly && WRITE_REQUESTS.has(request.type)) {
      const error = new ReadOnlyError(request.type);
      return failure(error.code, error.message);
    }

    switch (request.type) {
      case 'summary':
        return success(this.#dashboard.summary());
      case 'tasks':
        return success(this.#dashboard.tasks(request.limit));
      case 'runs':
        return success(this.#dashboard.runs(request.status, request.limit));
      case 'failures':
        return success(this.#dashboard.failures(request.limit));
      case 'task': {
        const task = this.#dashboard.task(request.id);
        return success(task.some ? task.value : null);
      }
      case 'run': {
        const run = this.#dashboard.run(request.id);
        return success(run.some ? run.value : null);
      }
      case 'cancelRun': {
        // Reachable only when read-only mode is disabled; still unsupported here
        // because the dashboard is a monitoring surface, not a control plane.
        const error = new ReadOnlyError(request.type);
        return failure(error.code, error.message);
      }
    }
  }
}
