import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isErr } from '@helix/core';
import { AtlasBootstrap, type BootstrapInput, type FileSink } from './bootstrap.js';

const nodeFileSink: FileSink = {
  exists: (path) => existsSync(path),
  write: (path, content) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, { encoding: 'utf8', flag: 'wx' });
  },
};

/**
 * The `helix-atlas-bootstrap` binary entry point. It reads a bootstrap
 * specification (JSON) from the file named on the command line and bootstraps
 * the Conflict Impact Atlas product project with Helix, printing the result.
 * This is the only module touching process globals and the filesystem.
 */
function main(): void {
  const specPath = process.argv[2];
  if (specPath === undefined) {
    process.stderr.write('usage: helix-atlas-bootstrap <bootstrap-spec.json>\n');
    process.exitCode = 2;
    return;
  }

  let input: BootstrapInput;
  try {
    input = JSON.parse(readFileSync(specPath, 'utf8')) as BootstrapInput;
  } catch (error) {
    process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
    return;
  }

  const result = new AtlasBootstrap(nodeFileSink).bootstrap(input);
  if (isErr(result)) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, code: result.error.code, message: result.error.message })}\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${JSON.stringify({ ok: true, result: result.value }, null, 2)}\n`);
}

main();
