import { type Option } from '@helix/core';
import { isApiCompatible, parseVersion, SDK_API_VERSION } from '@helix/plugin-sdk';
import type { CliConfig } from '../command.js';
import { ExitCode, type Command, type CommandContext, type CommandResult } from '../command.js';

/** The health status of a single diagnostic check. */
export type DoctorStatus = 'ok' | 'warning' | 'error';

/** The result of a single diagnostic check. */
export interface DoctorCheck {
  readonly name: string;
  readonly status: DoctorStatus;
  readonly message: string;
  /** Actionable repair guidance, present when the check is not `ok`. */
  readonly remediation?: string;
}

/** A diagnostic probe. */
export interface DoctorProbe {
  readonly name: string;
  run(): DoctorCheck;
}

/** The aggregated doctor report. */
export interface DoctorReport {
  readonly ok: boolean;
  readonly checks: readonly DoctorCheck[];
}

/** Run every probe and aggregate results (input order preserved). */
export function runProbes(probes: readonly DoctorProbe[]): DoctorReport {
  const checks = probes.map((probe) => probe.run());
  const ok = checks.every((check) => check.status !== 'error');
  return { ok, checks };
}

function renderText(report: DoctorReport): string {
  const glyph: Record<DoctorStatus, string> = { ok: 'ok  ', warning: 'warn', error: 'FAIL' };
  const lines: string[] = [];
  for (const check of report.checks) {
    lines.push(`${glyph[check.status]}  ${check.name}: ${check.message}`);
    if (check.status !== 'ok' && check.remediation !== undefined) {
      lines.push(`      → ${check.remediation}`);
    }
  }
  lines.push(report.ok ? 'diagnostics passed' : 'diagnostics failed');
  return lines.join('\n');
}

/**
 * `helix doctor` — run environment, toolchain, configuration, and plugin
 * compatibility probes, then report each result with repair guidance. The exit
 * code is stable: 0 unless a probe reports `error`. Warnings are surfaced but do
 * not fail the run (Constitution Article 7).
 */
export function createDoctorCommand(probes: readonly DoctorProbe[]): Command {
  return {
    name: 'doctor',
    description: 'diagnose the environment, toolchain, configuration, and plugins',
    run(context: CommandContext): CommandResult {
      const report = runProbes(probes);
      const json = context.flags['json'] === true;
      return {
        exitCode: report.ok ? ExitCode.success : ExitCode.error,
        output: json ? report : renderText(report),
      };
    },
  };
}

/** Probe that asserts a required environment value is present. */
export function environmentProbe(name: string, value: Option<string>): DoctorProbe {
  return {
    name,
    run(): DoctorCheck {
      if (value.some && value.value.trim() !== '') {
        return { name, status: 'ok', message: value.value };
      }
      return {
        name,
        status: 'error',
        message: 'not set',
        remediation: `set ${name} in the environment before running Helix`,
      };
    },
  };
}

/** Probe that asserts a tool's version meets a minimum (numeric semver comparison). */
export function toolchainProbe(tool: string, actual: string, minimum: string): DoctorProbe {
  return {
    name: tool,
    run(): DoctorCheck {
      const actualVersion = parseVersion(actual);
      const minimumVersion = parseVersion(minimum);
      if (actualVersion === null) {
        return {
          name: tool,
          status: 'error',
          message: `unrecognized version "${actual}"`,
          remediation: `install ${tool} ${minimum} or newer`,
        };
      }
      const meetsMinimum =
        minimumVersion === null || compareVersions(actualVersion, minimumVersion) >= 0;
      if (meetsMinimum) {
        return { name: tool, status: 'ok', message: actual };
      }
      return {
        name: tool,
        status: 'error',
        message: `${actual} is older than the required ${minimum}`,
        remediation: `upgrade ${tool} to ${minimum} or newer`,
      };
    },
  };
}

/** Probe that reports whether configuration was discovered. */
export function configurationProbe(config: Option<CliConfig>): DoctorProbe {
  return {
    name: 'configuration',
    run(): DoctorCheck {
      if (config.some) {
        return { name: 'configuration', status: 'ok', message: 'configuration discovered' };
      }
      return {
        name: 'configuration',
        status: 'warning',
        message: 'no configuration file found',
        remediation: 'run "helix init" or add a helix.config.json file',
      };
    },
  };
}

/** A plugin's declared host-API compatibility, as seen by doctor. */
export interface PluginApi {
  readonly name: string;
  readonly apiVersion: string;
}

/** Probe that checks each plugin against the SDK host API version. */
export function pluginCompatibilityProbe(plugins: readonly PluginApi[]): DoctorProbe {
  return {
    name: 'plugins',
    run(): DoctorCheck {
      const incompatible = plugins.filter(
        (plugin) => !isApiCompatible(plugin.apiVersion, SDK_API_VERSION),
      );
      if (incompatible.length === 0) {
        return {
          name: 'plugins',
          status: 'ok',
          message: `${plugins.length} plugin(s) compatible with API ${SDK_API_VERSION}`,
        };
      }
      const names = incompatible.map((plugin) => `${plugin.name}@${plugin.apiVersion}`).join(', ');
      return {
        name: 'plugins',
        status: 'error',
        message: `incompatible plugin(s): ${names}`,
        remediation: `update the listed plugin(s) to target host API ${SDK_API_VERSION}`,
      };
    },
  };
}

function compareVersions(
  a: { major: number; minor: number; patch: number },
  b: { major: number; minor: number; patch: number },
): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}
