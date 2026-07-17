import { readFileSync } from 'node:fs';
import { isErr } from '@helix/core';
import { QualityGate } from '@helix/governance';
import { ReleaseEngine, type ReleaseInput } from './release-engine.js';

/**
 * The `helix-release` binary entry point. It reads a release specification
 * (`{ current, changes, artifacts }`) from the file named on the command line,
 * enforces an (empty by default) quality gate, and prints the resulting release
 * plan as JSON. A blocked or invalid release exits non-zero with a typed error.
 * This is the only module touching process globals and the filesystem.
 */
function main(): void {
  const specPath = process.argv[2];
  if (specPath === undefined) {
    process.stderr.write('usage: helix-release <release-spec.json>\n');
    process.exitCode = 2;
    return;
  }

  let spec: Omit<ReleaseInput<Record<string, never>>, 'gateContext' | 'waivers'>;
  try {
    spec = JSON.parse(readFileSync(specPath, 'utf8')) as typeof spec;
  } catch (error) {
    process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
    return;
  }

  const engine = new ReleaseEngine<Record<string, never>>({
    gate: new QualityGate('release', []),
  });
  const result = engine.release({ ...spec, gateContext: {} });

  if (isErr(result)) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, code: result.error.code, message: result.error.message })}\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${JSON.stringify({ ok: true, plan: result.value }, null, 2)}\n`);
}

main();
