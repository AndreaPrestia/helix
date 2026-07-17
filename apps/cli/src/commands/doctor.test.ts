import { describe, expect, it } from 'vitest';
import { none, some } from '@helix/core';
import { SDK_API_VERSION } from '@helix/plugin-sdk';
import {
  configurationProbe,
  createDoctorCommand,
  environmentProbe,
  pluginCompatibilityProbe,
  runProbes,
  toolchainProbe,
  type DoctorProbe,
} from './doctor.js';
import { ExitCode, type CliIo, type CommandContext } from '../command.js';

const io: CliIo = { writeOut: () => {}, writeErr: () => {} };

function context(flags: Record<string, string | boolean> = {}): CommandContext {
  return { args: [], flags, config: none(), io };
}

function probe(name: string, status: 'ok' | 'warning' | 'error'): DoctorProbe {
  return { name, run: () => ({ name, status, message: status }) };
}

describe('runProbes', () => {
  it('is ok when no probe reports an error', () => {
    expect(runProbes([probe('a', 'ok'), probe('b', 'warning')]).ok).toBe(true);
  });

  it('is not ok when a probe reports an error', () => {
    expect(runProbes([probe('a', 'error')]).ok).toBe(false);
  });
});

describe('doctor command', () => {
  it('exits 0 when diagnostics pass', async () => {
    const result = await createDoctorCommand([probe('a', 'ok')]).run(context());
    expect(result.exitCode).toBe(ExitCode.success);
  });

  it('exits 0 on warnings only', async () => {
    const result = await createDoctorCommand([probe('a', 'warning')]).run(context());
    expect(result.exitCode).toBe(ExitCode.success);
  });

  it('exits 1 on an error', async () => {
    const result = await createDoctorCommand([probe('a', 'error')]).run(context());
    expect(result.exitCode).toBe(ExitCode.error);
  });

  it('emits the structured report under --json', async () => {
    const result = await createDoctorCommand([probe('a', 'ok')]).run(context({ json: true }));
    expect(result.output).toMatchObject({ ok: true });
  });
});

describe('environmentProbe', () => {
  it('is ok when the value is present', () => {
    expect(environmentProbe('X', some('v')).run().status).toBe('ok');
  });

  it('errors with remediation when absent', () => {
    const check = environmentProbe('X', none()).run();
    expect(check.status).toBe('error');
    expect(check.remediation).toBeDefined();
  });
});

describe('toolchainProbe', () => {
  it('is ok when the version meets the minimum', () => {
    expect(toolchainProbe('node', '22.5.0', '22.0.0').run().status).toBe('ok');
  });

  it('errors when the version is too old', () => {
    const check = toolchainProbe('node', '18.0.0', '22.0.0').run();
    expect(check.status).toBe('error');
    expect(check.remediation).toContain('22.0.0');
  });

  it('errors on an unrecognized version', () => {
    expect(toolchainProbe('node', 'not-a-version', '22.0.0').run().status).toBe('error');
  });
});

describe('configurationProbe', () => {
  it('is ok when configuration is discovered', () => {
    expect(configurationProbe(some({})).run().status).toBe('ok');
  });

  it('warns when configuration is absent', () => {
    expect(configurationProbe(none()).run().status).toBe('warning');
  });
});

describe('pluginCompatibilityProbe', () => {
  it('is ok for compatible plugins', () => {
    expect(
      pluginCompatibilityProbe([{ name: 'p', apiVersion: SDK_API_VERSION }]).run().status,
    ).toBe('ok');
  });

  it('errors for an incompatible plugin', () => {
    const check = pluginCompatibilityProbe([{ name: 'p', apiVersion: '2.0.0' }]).run();
    expect(check.status).toBe('error');
    expect(check.message).toContain('p@2.0.0');
  });
});
