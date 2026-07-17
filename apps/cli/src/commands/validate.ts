import { isErr } from '@helix/core';
import type { ChangeStructure, GateReport, Waiver } from '@helix/governance';
import { QualityGate, validateChangeStructure } from '@helix/governance';
import { ExitCode, type Command, type CommandContext, type CommandResult } from '../command.js';

/** Severity of a validation finding. */
export type ValidationSeverity = 'error' | 'warning';

/** A single finding produced by a validation check. */
export interface ValidationFinding {
  readonly severity: ValidationSeverity;
  readonly message: string;
}

/** A named validation check. Returns its findings (empty means it passed). */
export interface ValidationCheck {
  readonly name: string;
  run(): readonly ValidationFinding[];
}

/** The aggregated report of a validation run. */
export interface ValidationReport {
  readonly ok: boolean;
  readonly checks: readonly {
    readonly name: string;
    readonly findings: readonly ValidationFinding[];
  }[];
}

/** Run every check and aggregate the findings deterministically (input order preserved). */
export function runChecks(checks: readonly ValidationCheck[]): ValidationReport {
  const results = checks.map((check) => ({ name: check.name, findings: check.run() }));
  const ok = results.every((result) => result.findings.every((f) => f.severity !== 'error'));
  return { ok, checks: results };
}

function renderText(report: ValidationReport): string {
  const lines: string[] = [];
  for (const check of report.checks) {
    if (check.findings.length === 0) {
      lines.push(`pass  ${check.name}`);
      continue;
    }
    for (const finding of check.findings) {
      lines.push(
        `${finding.severity === 'error' ? 'FAIL' : 'warn'}  ${check.name}: ${finding.message}`,
      );
    }
  }
  lines.push(report.ok ? 'validation passed' : 'validation failed');
  return lines.join('\n');
}

/**
 * `helix validate` — run a set of validation checks (OpenSpec structure,
 * architecture rules, quality gates) and report their findings. Emits a stable
 * exit code (0 when no error-severity finding is present, 1 otherwise) and
 * supports human and `--json` output. A passing result never conceals a failing
 * check (Constitution Article 7).
 */
export function createValidateCommand(checks: readonly ValidationCheck[]): Command {
  return {
    name: 'validate',
    description: 'validate OpenSpec structure, architecture rules, and quality gates',
    run(context: CommandContext): CommandResult {
      const report = runChecks(checks);
      const json = context.flags['json'] === true;
      return {
        exitCode: report.ok ? ExitCode.success : ExitCode.error,
        output: json ? report : renderText(report),
      };
    },
  };
}

/** Build a check that validates the structure of the given OpenSpec changes. */
export function openSpecValidationCheck(changes: readonly ChangeStructure[]): ValidationCheck {
  return {
    name: 'openspec',
    run(): readonly ValidationFinding[] {
      const findings: ValidationFinding[] = [];
      for (const change of changes) {
        const result = validateChangeStructure(change);
        if (isErr(result)) {
          for (const issue of result.error.issues) {
            findings.push({ severity: 'error', message: `${change.id}: ${issue}` });
          }
        }
      }
      return findings;
    },
  };
}

/** A single architecture-rule violation, mirroring the harness violation shape. */
export interface ArchitectureViolation {
  readonly rule: string;
  readonly package: string;
  readonly detail: string;
}

/** Build a check from a provider of architecture-rule violations. */
export function architectureRulesCheck(
  provider: () => readonly ArchitectureViolation[],
): ValidationCheck {
  return {
    name: 'architecture',
    run(): readonly ValidationFinding[] {
      return provider().map((violation) => ({
        severity: 'error',
        message: `[${violation.rule}] ${violation.package}: ${violation.detail}`,
      }));
    },
  };
}

/** Build a check that evaluates a governance quality gate. */
export function qualityGateCheck<Context>(
  gate: QualityGate<Context>,
  gateContext: Context,
  waivers: readonly Waiver[] = [],
): ValidationCheck {
  return {
    name: 'quality-gate',
    run(): readonly ValidationFinding[] {
      const report: GateReport = gate.evaluate(gateContext, waivers);
      if (report.status === 'passed') {
        return [];
      }
      return report.deniedPolicies.map((policyId) => ({
        severity: 'error',
        message: `policy "${policyId}" denied`,
      }));
    },
  };
}
