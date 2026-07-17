import { fileURLToPath } from 'node:url';
import { isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { OpenSpecEngine } from './engine.js';
import { FileSystemFileStore } from './filesystem-file-store.js';
import { InMemoryFileStore } from './in-memory-file-store.js';
import { archiveChange } from './apply.js';

const tree = {
  'specs/foundation/demo/spec.md':
    '# Demo\n## Requirements\n### Requirement: A\nMUST do A.\n### Requirement: B\nMUST do B.\n',
  'changes/0001-demo/change.yaml': 'id: 0001-demo\nstatus: proposed\ndepends_on: []\n',
  'changes/0001-demo/proposal.md': '# Proposal',
  'changes/0001-demo/tasks.md': '# Tasks',
  'changes/0001-demo/specs/foundation/demo/spec.md':
    '# Delta\n## ADDED Requirements\n### Requirement: C\nMUST do C.\n## MODIFIED Requirements\nNone.\n## REMOVED Requirements\nNone.\n',
};

describe('OpenSpecEngine (in-memory)', () => {
  const engine = new OpenSpecEngine(new InMemoryFileStore(tree));

  it('discovers baseline specs', async () => {
    const result = await engine.discoverBaselineSpecs();
    if (isOk(result)) {
      expect(result.value.map((s) => s.capability)).toEqual(['foundation/demo']);
      expect(result.value[0]?.requirements.map((r) => r.name)).toEqual(['A', 'B']);
    }
  });

  it('discovers active changes with their deltas', async () => {
    const result = await engine.discoverActiveChanges();
    if (isOk(result)) {
      expect(result.value).toHaveLength(1);
      const change = result.value[0];
      expect(change?.id).toBe('0001-demo');
      expect(change?.hasProposal).toBe(true);
      expect(change?.hasTasks).toBe(true);
      expect(change?.deltas[0]?.capability).toBe('foundation/demo');
      expect(change?.deltas[0]?.requirements[0]?.name).toBe('C');
    }
  });

  it('archives a discovered change by merging its delta into the baseline', async () => {
    const specs = await engine.discoverBaselineSpecs();
    const changes = await engine.discoverActiveChanges();
    if (isOk(specs) && isOk(changes) && changes.value[0] !== undefined) {
      const outcome = archiveChange(changes.value[0], specs.value);
      if (isOk(outcome)) {
        const demo = outcome.value.updatedSpecs.find((s) => s.capability === 'foundation/demo');
        expect(demo?.requirements.map((r) => r.name)).toEqual(['A', 'B', 'C']);
        expect(outcome.value.archivedChangeId).toBe('0001-demo');
      }
    }
  });
});

describe('OpenSpecEngine (real filesystem)', () => {
  const openSpecRoot = fileURLToPath(new URL('../../../openspec', import.meta.url));
  const engine = new OpenSpecEngine(new FileSystemFileStore(openSpecRoot));

  it('discovers the real baseline specs', async () => {
    const result = await engine.discoverBaselineSpecs();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.some((s) => s.capability === 'foundation/workspace-bootstrap')).toBe(
        true,
      );
    }
  });

  it('discovers and validates the real changes', async () => {
    const result = await engine.discoverActiveChanges();
    if (isOk(result)) {
      const first = result.value.find((c) => c.id === '0001-workspace-bootstrap');
      expect(first).toBeDefined();
      expect(first?.hasProposal).toBe(true);
      expect(first?.manifest.id).toBe('0001-workspace-bootstrap');
    }
  });
});
