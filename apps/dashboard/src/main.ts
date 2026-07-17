import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fromNullable } from '@helix/core';
import { DashboardApi, type DashboardRequest } from './api.js';
import { TokenAuthenticator, type Principal } from './auth.js';
import { Dashboard } from './dashboard.js';
import type { DashboardSnapshot } from './model.js';
import type { DashboardSource } from './source.js';

const EMPTY_SNAPSHOT: DashboardSnapshot = { sessions: [], jobs: [] };

/**
 * Reads the daemon snapshot from the file named by `HELIX_DASHBOARD_SNAPSHOT`
 * on each call so the dashboard reflects current state. Falls back to an empty
 * snapshot when no file is configured or it cannot be read/parsed.
 */
function fileSnapshotSource(path: string | undefined): DashboardSource {
  return {
    snapshot(): DashboardSnapshot {
      if (path === undefined) {
        return EMPTY_SNAPSHOT;
      }
      try {
        const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as DashboardSnapshot;
        }
      } catch {
        // Fall through to the empty snapshot on any read/parse failure.
      }
      return EMPTY_SNAPSHOT;
    },
  };
}

/**
 * The `helix-dashboard` binary entry point. It mints a local access token,
 * wires a read-only dashboard over a daemon snapshot source, and serves the
 * authenticated read-only API as newline-delimited JSON (`{ token, request }`)
 * over stdin/stdout. This is the only module touching process globals and I/O.
 */
function main(): void {
  const token = randomUUID();
  const principal: Principal = { id: 'local' };
  const authenticator = new TokenAuthenticator(new Map([[token, principal]]));

  const source = fileSnapshotSource(process.env['HELIX_DASHBOARD_SNAPSHOT']);
  const dashboard = new Dashboard(source);
  const api = new DashboardApi(dashboard, authenticator, { readOnly: true });

  process.stdout.write(`${JSON.stringify({ event: 'ready', token, readOnly: true })}\n`);

  const rl = createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      return;
    }
    let payload: { token?: string; request?: DashboardRequest };
    try {
      payload = JSON.parse(trimmed) as { token?: string; request?: DashboardRequest };
    } catch {
      process.stdout.write(
        `${JSON.stringify({ ok: false, code: 'BAD_REQUEST', message: 'invalid JSON' })}\n`,
      );
      return;
    }
    if (payload.request === undefined) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, code: 'BAD_REQUEST', message: 'missing request' })}\n`,
      );
      return;
    }
    const response = api.handle(payload.request, fromNullable(payload.token));
    process.stdout.write(`${JSON.stringify(response)}\n`);
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

main();
