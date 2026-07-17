import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import type { Clock, IdGenerator } from '@helix/core';
import { Daemon, type DaemonDeps } from './daemon.js';
import { InMemoryDaemonStateStore } from './store.js';
import { LocalApi, type DaemonRequest } from './local-api.js';

/**
 * The `helix-daemon` binary entry point. It wires real ports (system clock,
 * UUID id generator, in-memory durable store) and serves the local API as
 * newline-delimited JSON over stdin/stdout. This is the only module touching
 * process globals and I/O; all behaviour lives in unit-tested modules.
 */
function main(): void {
  const clock: Clock = { now: () => new Date() };
  const ids: IdGenerator = { next: () => randomUUID() };
  const deps: DaemonDeps = { clock, ids, store: new InMemoryDaemonStateStore() };

  const daemon = Daemon.recover(deps);
  const api = new LocalApi(daemon);

  const shutdown = (): void => {
    const snapshot = daemon.shutdown();
    process.stdout.write(`${JSON.stringify({ event: 'shutdown', snapshot })}\n`);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const rl = createInterface({ input: process.stdin });
  process.stdout.write(`${JSON.stringify({ event: 'ready', status: daemon.status() })}\n`);

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      return;
    }
    let request: DaemonRequest;
    try {
      request = JSON.parse(trimmed) as DaemonRequest;
    } catch {
      process.stdout.write(
        `${JSON.stringify({ ok: false, code: 'BAD_REQUEST', message: 'invalid JSON' })}\n`,
      );
      return;
    }
    const response = api.handle(request);
    process.stdout.write(`${JSON.stringify(response)}\n`);
  });

  rl.on('close', shutdown);
}

main();
