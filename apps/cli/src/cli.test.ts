import { none, some } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { Cli } from './cli.js';
import { ExitCode, type CliIo, type Command } from './command.js';

interface Capture {
  readonly io: CliIo;
  readonly out: string[];
  readonly err: string[];
}

function capture(): Capture {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: {
      writeOut: (text) => out.push(text),
      writeErr: (text) => err.push(text),
    },
  };
}

const echo: Command = {
  name: 'echo',
  description: 'echo the first argument',
  run: (ctx) => ({ exitCode: ExitCode.success, output: ctx.args[0] ?? '' }),
};

describe('Cli', () => {
  it('prints help and exits 0 with no command', async () => {
    const cap = capture();
    const result = await new Cli().register(echo).run([], cap.io);
    expect(result.exitCode).toBe(ExitCode.success);
    expect(cap.out.join('\n')).toContain('echo');
  });

  it('prints help for the help command', async () => {
    const cap = capture();
    const result = await new Cli().run(['help'], cap.io);
    expect(result.exitCode).toBe(ExitCode.success);
  });

  it('returns usage exit code for an unknown command', async () => {
    const cap = capture();
    const result = await new Cli().run(['nope'], cap.io);
    expect(result.exitCode).toBe(ExitCode.usage);
    expect(cap.err.join('\n')).toContain('unknown command "nope"');
  });

  it('runs a command and writes text output', async () => {
    const cap = capture();
    const result = await new Cli().register(echo).run(['echo', 'hi'], cap.io);
    expect(result.exitCode).toBe(ExitCode.success);
    expect(cap.out).toEqual(['hi']);
  });

  it('renders JSON output when --json is passed', async () => {
    const cap = capture();
    const command: Command = {
      name: 'obj',
      description: 'emit an object',
      run: () => ({ exitCode: ExitCode.success, output: { ok: true } }),
    };
    const result = await new Cli().register(command).run(['obj', '--json'], cap.io);
    expect(result.exitCode).toBe(ExitCode.success);
    expect(cap.out).toEqual(['{"ok":true}']);
  });

  it('writes diagnostics to the error stream', async () => {
    const cap = capture();
    const command: Command = {
      name: 'warn',
      description: 'emit a diagnostic',
      run: () => ({
        exitCode: ExitCode.success,
        diagnostics: [{ severity: 'warning', code: 'W1', message: 'careful' }],
      }),
    };
    await new Cli().register(command).run(['warn'], cap.io);
    expect(cap.err).toEqual(['warning: [W1] careful']);
  });

  it('maps a thrown error to the error exit code', async () => {
    const cap = capture();
    const command: Command = {
      name: 'boom',
      description: 'throws',
      run: () => {
        throw new Error('kaboom');
      },
    };
    const result = await new Cli().register(command).run(['boom'], cap.io);
    expect(result.exitCode).toBe(ExitCode.error);
    expect(cap.err.join('\n')).toContain('kaboom');
  });

  it('exposes the discovered config to commands', async () => {
    const cap = capture();
    let seen: unknown;
    const command: Command = {
      name: 'cfg',
      description: 'reads config',
      run: (ctx) => {
        seen = ctx.config.some ? ctx.config.value : undefined;
        return { exitCode: ExitCode.success };
      },
    };
    await new Cli().register(command).run(['cfg'], cap.io, { config: some({ a: 1 }) });
    expect(seen).toEqual({ a: 1 });
  });

  it('defaults config to none', async () => {
    const cap = capture();
    let present = true;
    const command: Command = {
      name: 'cfg',
      description: 'reads config',
      run: (ctx) => {
        present = ctx.config.some;
        return { exitCode: ExitCode.success };
      },
    };
    await new Cli().register(command).run(['cfg'], cap.io, { config: none() });
    expect(present).toBe(false);
  });
});
