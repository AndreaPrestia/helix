import { type Option, none } from '@helix/core';
import { parseArgs } from './args.js';
import {
  type CliConfig,
  type CliIo,
  type Command,
  type CommandContext,
  ExitCode,
} from './command.js';
import { formatOutput, type OutputFormat } from './output.js';

/** The outcome of a CLI run. */
export interface RunResult {
  readonly exitCode: number;
}

/** Options controlling a run. */
export interface RunOptions {
  readonly config?: Option<CliConfig>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * A minimal, dependency-free command framework. Commands are registered by name
 * and dispatched from an argument vector. Output is rendered as text or JSON,
 * diagnostics go to the error stream, and every path maps to a deterministic
 * exit code (Constitution Articles 3, 7). I/O is injected so runs are pure and
 * testable — no process globals are touched here.
 */
export class Cli {
  readonly #name: string;
  readonly #commands = new Map<string, Command>();

  constructor(name = 'helix') {
    this.#name = name;
  }

  /** Register a command. A duplicate name replaces the previous registration. */
  register(command: Command): this {
    this.#commands.set(command.name, command);
    return this;
  }

  /** Registered commands, sorted by name. */
  commands(): readonly Command[] {
    return [...this.#commands.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Run the CLI against an argument vector (excluding the node/script prefix). */
  async run(argv: readonly string[], io: CliIo, options: RunOptions = {}): Promise<RunResult> {
    const [name, ...rest] = argv;

    if (name === undefined || name === 'help' || name === '--help') {
      this.#printHelp(io);
      return { exitCode: ExitCode.success };
    }

    const command = this.#commands.get(name);
    if (command === undefined) {
      io.writeErr(`error: unknown command "${name}"`);
      this.#printHelp(io);
      return { exitCode: ExitCode.usage };
    }

    const { args, flags } = parseArgs(rest);
    const format: OutputFormat = flags['json'] === true ? 'json' : 'text';
    const context: CommandContext = { args, flags, config: options.config ?? none(), io };

    let result;
    try {
      result = await command.run(context);
    } catch (error) {
      io.writeErr(`error: ${errorMessage(error)}`);
      return { exitCode: ExitCode.error };
    }

    if (result.output !== undefined) {
      io.writeOut(formatOutput(result.output, format));
    }
    for (const diagnostic of result.diagnostics ?? []) {
      io.writeErr(`${diagnostic.severity}: [${diagnostic.code}] ${diagnostic.message}`);
    }
    return { exitCode: result.exitCode };
  }

  #printHelp(io: CliIo): void {
    io.writeOut(`${this.#name} <command> [options]`);
    io.writeOut('');
    io.writeOut('Commands:');
    for (const command of this.commands()) {
      io.writeOut(`  ${command.name}  ${command.description}`);
    }
  }
}
