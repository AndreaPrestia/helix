import { describe, expect, it } from 'vitest';
import { readJson, repoRoot } from '../support/repo.js';
import type { DependencyRules } from './checker/model.js';
import { runAllChecks } from './checker/rules.js';
import { loadWorkspacePackages } from './checker/workspace.js';

const rules = readJson<DependencyRules>('reference/architecture/package-dependency-rules.json');

describe('real workspace package boundaries', () => {
  const packages = loadWorkspacePackages(repoRoot);

  it('exposes a deterministic package model for the current workspace', () => {
    const first = loadWorkspacePackages(repoRoot);
    const second = loadWorkspacePackages(repoRoot);
    expect(first.map((p) => p.name)).toEqual(second.map((p) => p.name));
  });

  it('has no architecture-rule violations', () => {
    expect(runAllChecks(packages, rules)).toEqual([]);
  });
});
