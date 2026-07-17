import type { Option } from '@helix/core';

/** Deterministic process exit codes. */
export const ExitCode = {
  success: 0,
  error: 1,
  usage: 2,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

/** Severity of a CLI diagnostic. */
export type DiagnosticSeverity = 'info' | 'warning' | 'error';

/** A structured diagnostic message emitted by a command. */
export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly code: string;
  readonly message: string;
}

/** Output sinks injected into the CLI so runs are testable and side-effect free. */
export interface CliIo {
  writeOut(text: string): void;
  writeErr(text: string): void;
}

/** Parsed command-line configuration discovered from the workspace. */
export interface CliConfig {
  readonly [key: string]: unknown;
}

/** The context passed to a command. */
export interface CommandContext {
  /** Positional arguments (after the command name). */
  readonly args: readonly string[];
  /** Parsed flags (`--flag` → true, `--key=value` → string). */
  readonly flags: Readonly<Record<string, string | boolean>>;
  /** Discovered configuration, if any. */
  readonly config: Option<CliConfig>;
  /** Output sinks. */
  readonly io: CliIo;
}

/** The result of running a command. */
export interface CommandResult {
  readonly exitCode: number;
  /** Structured output rendered according to the requested format. */
  readonly output?: unknown;
  /** Diagnostics written to the error stream. */
  readonly diagnostics?: readonly Diagnostic[];
}

/** A CLI command. */
export interface Command {
  readonly name: string;
  readonly description: string;
  run(context: CommandContext): CommandResult | Promise<CommandResult>;
}
