import { isErr, none, some, type Option } from '@helix/core';
import { Cli } from './cli.js';
import type { CliConfig, CliIo } from './command.js';
import { ExitCode } from './command.js';
import { discoverConfig, fileSystemConfigReader } from './config.js';

/**
 * The `helix` binary entry point. This is the only module that touches process
 * globals; all behaviour lives in unit-tested, injectable modules.
 */
async function main(): Promise<void> {
  const io: CliIo = {
    writeOut: (text) => process.stdout.write(`${text}\n`),
    writeErr: (text) => process.stderr.write(`${text}\n`),
  };

  const cli = new Cli('helix');

  let config: Option<CliConfig> = none();
  const discovered = discoverConfig(fileSystemConfigReader, process.cwd());
  if (isErr(discovered)) {
    io.writeErr(`error: ${discovered.error.message}`);
    process.exitCode = ExitCode.error;
    return;
  }
  if (discovered.value.some) {
    config = some(discovered.value.value.config);
  }

  const result = await cli.run(process.argv.slice(2), io, { config });
  process.exitCode = result.exitCode;
}

void main();
