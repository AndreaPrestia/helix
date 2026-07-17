import { describe, expect, it } from 'vitest';
import { none } from '@helix/core';
import type { ChangeStructure } from '@helix/governance';
import { QualityGate, allow, deny } from '@helix/governance';
import {
  architectureRulesCheck,
  createValidateCommand,
  openSpecValidationCheck,
  qualityGateCheck,
  runChecks,
  type ValidationCheck,
  type ValidationReport,
} from './validate.js';
import { ExitCode, type CliIo, type CommandContext } from '../command.js';

const io: CliIo = { writeOut: () => {}, writeErr: () => {} };

function context(flags: Record<string, string | boolean> = {}): CommandContext {
  return { args: [], flags, config: none(), io };
}

function passing(name: string): ValidationCheck {
  return { name, run: () => [] };
}

function failing(name: string): ValidationCheck {
  return { name, run: () => [{ severity: 'error', message: 'boom' }] };
}

function validChange(id: string): ChangeStructure {
  return {
    id,
    manifest: { id, status: 'proposed', dependsOn: [] },
    hasProposal: true,
    hasTasks: true,
    deltas: [{ capability: 'x', requirements: [{ operation: 'added', name: 'r', text: 't' }] }],
  };
}

describe('runChecks', () => {
  it('is ok when no check reports an error', () => {
    const report = runChecks([passing('a'), passing('b')]);
    expect(report.ok).toBe(true);
  });

  it('is not ok when any check reports an error', () => {
    const report: ValidationReport = runChecks([passing('a'), failing('b')]);
    expect(report.ok).toBe(false);
  });

  it('is ok when the only findings are warnings', () => {
    const report = runChecks([{ name: 'w', run: () => [{ severity: 'warning', message: 'meh' }] }]);
    expect(report.ok).toBe(true);
  });
});

describe('validate command', () => {
  it('exits 0 when validation passes', async () => {
    const result = await createValidateCommand([passing('a')]).run(context());
    expect(result.exitCode).toBe(ExitCode.success);
  });

  it('exits 1 when validation fails', async () => {
    const result = await createValidateCommand([failing('a')]).run(context());
    expect(result.exitCode).toBe(ExitCode.error);
  });

  it('emits the structured report under --json', async () => {
    const result = await createValidateCommand([failing('a')]).run(context({ json: true }));
    expect(result.output).toMatchObject({ ok: false });
  });

  it('emits human text by default', async () => {
    const result = await createValidateCommand([passing('a')]).run(context());
    expect(String(result.output)).toContain('validation passed');
  });
});

describe('openSpecValidationCheck', () => {
  it('passes for a well-formed change', () => {
    expect(openSpecValidationCheck([validChange('0001-x')]).run()).toEqual([]);
  });

  it('reports structural issues', () => {
    const broken: ChangeStructure = {
      ...validChange('0001-x'),
      manifest: { id: 'mismatch', status: 'proposed', dependsOn: [] },
      hasProposal: false,
    };
    const findings = openSpecValidationCheck([broken]).run();
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.severity === 'error')).toBe(true);
  });
});

describe('architectureRulesCheck', () => {
  it('passes when there are no violations', () => {
    expect(architectureRulesCheck(() => []).run()).toEqual([]);
  });

  it('maps violations to error findings', () => {
    const findings = architectureRulesCheck(() => [
      { rule: 'no-cycles', package: '@helix/a', detail: 'cycle' },
    ]).run();
    expect(findings).toEqual([{ severity: 'error', message: '[no-cycles] @helix/a: cycle' }]);
  });
});

describe('qualityGateCheck', () => {
  it('passes when the gate passes', () => {
    const gate = new QualityGate<Record<string, never>>('g', [
      { id: 'p', evaluate: () => allow('p') },
    ]);
    expect(qualityGateCheck(gate, {}).run()).toEqual([]);
  });

  it('reports denied policies', () => {
    const gate = new QualityGate<Record<string, never>>('g', [
      { id: 'p', evaluate: () => deny('p', ['nope']) },
    ]);
    const findings = qualityGateCheck(gate, {}).run();
    expect(findings).toEqual([{ severity: 'error', message: 'policy "p" denied' }]);
  });
});
