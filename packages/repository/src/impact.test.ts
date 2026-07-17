import { isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { documentationAttribute, ImpactAnalyzer } from './impact.js';
import { fileNodeId, packageNodeId, symbolNodeId, testNodeId } from './ids.js';
import type { RepositoryNode } from './model.js';
import { RepositoryGraph } from './repository-graph.js';

function node(
  id: string,
  kind: RepositoryNode['kind'],
  name: string,
  attributes: Record<string, string> = {},
): RepositoryNode {
  return { id, kind, name, attributes };
}

const pkg = packageNodeId('@helix/core');
const file = fileNodeId('src/result.ts');
const symbol = symbolNodeId('src/result.ts', 'ok');
const test = testNodeId('src/result.test.ts');
const doc = fileNodeId('docs/result.md');

function buildGraph(): RepositoryGraph {
  const graph = new RepositoryGraph();
  graph.upsertNode(node(pkg, 'package', '@helix/core'));
  graph.upsertNode(node(file, 'file', 'result.ts'));
  graph.upsertNode(node(symbol, 'symbol', 'ok'));
  graph.upsertNode(node(test, 'test', 'result.test.ts'));
  graph.upsertNode(node(doc, 'file', 'result.md', { [documentationAttribute]: 'true' }));

  graph.upsertEdge({ from: pkg, to: file, kind: 'contains' });
  graph.upsertEdge({ from: file, to: symbol, kind: 'contains' });
  graph.upsertEdge({ from: test, to: symbol, kind: 'tests' });
  graph.upsertEdge({ from: symbol, to: 'HELIX-SPEC-001', kind: 'implements_requirement' });
  graph.upsertEdge({ from: symbol, to: 'ADR-0006', kind: 'references_adr' });
  graph.upsertEdge({ from: doc, to: 'ADR-0006', kind: 'references_adr' });
  return graph;
}

describe('ImpactAnalyzer', () => {
  it('computes impacted nodes by reverse structural reachability', () => {
    const report = new ImpactAnalyzer(buildGraph()).analyze([symbol]);
    expect(isOk(report)).toBe(true);
    if (isOk(report)) {
      expect(report.value.impactedNodes).toEqual([pkg, file, symbol, test].sort());
    }
  });

  it('reports affected requirements and decisions', () => {
    const report = new ImpactAnalyzer(buildGraph()).analyze([symbol]);
    if (isOk(report)) {
      expect(report.value.affectedRequirements).toEqual(['HELIX-SPEC-001']);
      expect(report.value.affectedDecisions).toEqual(['ADR-0006']);
    }
  });

  it('recommends impacted tests', () => {
    const report = new ImpactAnalyzer(buildGraph()).analyze([symbol]);
    if (isOk(report)) {
      expect(report.value.recommendedTests).toEqual([test]);
    }
  });

  it('flags documentation whose referenced decision is affected', () => {
    const report = new ImpactAnalyzer(buildGraph()).analyze([symbol]);
    if (isOk(report)) {
      // doc is not structurally connected but references the affected ADR-0006.
      expect(report.value.documentationImpact).toContain(doc);
    }
  });

  it('produces no impact beyond the change when nothing depends on it', () => {
    const graph = new RepositoryGraph();
    graph.upsertNode(node(symbol, 'symbol', 'ok'));
    const report = new ImpactAnalyzer(graph).analyze([symbol]);
    if (isOk(report)) {
      expect(report.value.impactedNodes).toEqual([symbol]);
      expect(report.value.recommendedTests).toEqual([]);
      expect(report.value.documentationImpact).toEqual([]);
    }
  });

  it('fails for an unknown changed node', () => {
    const report = new ImpactAnalyzer(buildGraph()).analyze(['symbol:ghost#x']);
    expect(isErr(report)).toBe(true);
    if (isErr(report)) {
      expect(report.error.code).toBe('REPO_UNKNOWN_NODE');
    }
  });

  it('is deterministic (stable, sorted output)', () => {
    const graph = buildGraph();
    const a = new ImpactAnalyzer(graph).analyze([symbol]);
    const b = new ImpactAnalyzer(graph).analyze([symbol]);
    expect(a).toEqual(b);
  });
});
