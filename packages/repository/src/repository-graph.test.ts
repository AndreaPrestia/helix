import { isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { fileNodeId, packageNodeId, symbolNodeId, testNodeId } from './ids.js';
import type { RepositoryNode } from './model.js';
import { RepositoryGraph } from './repository-graph.js';

function node(id: string, kind: RepositoryNode['kind'], name: string): RepositoryNode {
  return { id, kind, name, attributes: {} };
}

describe('stable node identifiers', () => {
  it('derives deterministic ids from artifacts', () => {
    expect(packageNodeId('@helix/core')).toBe('package:@helix/core');
    expect(fileNodeId('packages/core/src/index.ts')).toBe('file:packages/core/src/index.ts');
    expect(symbolNodeId('packages/core/src/result.ts', 'ok')).toBe(
      'symbol:packages/core/src/result.ts#ok',
    );
    expect(testNodeId('a.test.ts')).toBe('test:a.test.ts');
    // Stable across calls.
    expect(symbolNodeId('p', 's')).toBe(symbolNodeId('p', 's'));
  });
});

describe('RepositoryGraph structure', () => {
  function buildGraph(): RepositoryGraph {
    const graph = new RepositoryGraph();
    graph.upsertNode(node(packageNodeId('@helix/core'), 'package', '@helix/core'));
    graph.upsertNode(node(fileNodeId('src/result.ts'), 'file', 'result.ts'));
    graph.upsertNode(node(symbolNodeId('src/result.ts', 'ok'), 'symbol', 'ok'));
    graph.upsertNode(node(testNodeId('src/result.test.ts'), 'test', 'result.test.ts'));
    graph.upsertEdge({
      from: packageNodeId('@helix/core'),
      to: fileNodeId('src/result.ts'),
      kind: 'contains',
    });
    graph.upsertEdge({
      from: fileNodeId('src/result.ts'),
      to: symbolNodeId('src/result.ts', 'ok'),
      kind: 'contains',
    });
    graph.upsertEdge({
      from: testNodeId('src/result.test.ts'),
      to: symbolNodeId('src/result.ts', 'ok'),
      kind: 'tests',
    });
    return graph;
  }

  it('stores packages, files, symbols, and tests', () => {
    const graph = buildGraph();
    expect(graph.nodesByKind('package')).toHaveLength(1);
    expect(graph.nodesByKind('file')).toHaveLength(1);
    expect(graph.nodesByKind('symbol')).toHaveLength(1);
    expect(graph.nodesByKind('test')).toHaveLength(1);
  });

  it('resolves neighbors deterministically', () => {
    const graph = buildGraph();
    const contained = graph.neighbors(packageNodeId('@helix/core'), 'contains');
    expect(contained.map((n) => n.name)).toEqual(['result.ts']);
    const tested = graph.neighbors(testNodeId('src/result.test.ts'), 'tests');
    expect(tested.map((n) => n.name)).toEqual(['ok']);
  });

  it('rejects edges from or to unknown nodes for structural kinds', () => {
    const graph = new RepositoryGraph();
    graph.upsertNode(node(packageNodeId('@helix/core'), 'package', '@helix/core'));
    const missingFrom = graph.upsertEdge({
      from: 'file:ghost',
      to: packageNodeId('@helix/core'),
      kind: 'contains',
    });
    expect(isErr(missingFrom)).toBe(true);
    const missingTo = graph.upsertEdge({
      from: packageNodeId('@helix/core'),
      to: 'file:ghost',
      kind: 'contains',
    });
    expect(isErr(missingTo)).toBe(true);
    if (isErr(missingTo)) {
      expect(missingTo.error.code).toBe('REPO_UNKNOWN_NODE');
    }
  });
});

describe('requirement and ADR links', () => {
  it('links nodes to requirements and ADRs and queries both directions', () => {
    const graph = new RepositoryGraph();
    const symbol = symbolNodeId('src/result.ts', 'ok');
    graph.upsertNode(node(symbol, 'symbol', 'ok'));
    expect(
      isOk(
        graph.upsertEdge({ from: symbol, to: 'HELIX-SPEC-001', kind: 'implements_requirement' }),
      ),
    ).toBe(true);
    expect(isOk(graph.upsertEdge({ from: symbol, to: 'ADR-0006', kind: 'references_adr' }))).toBe(
      true,
    );

    expect(graph.requirementLinks(symbol)).toEqual(['HELIX-SPEC-001']);
    expect(graph.adrLinks(symbol)).toEqual(['ADR-0006']);
    expect(graph.nodesImplementing('HELIX-SPEC-001').map((n) => n.id)).toEqual([symbol]);
    expect(graph.nodesReferencingAdr('ADR-0006').map((n) => n.id)).toEqual([symbol]);
  });
});

describe('incremental updates', () => {
  it('upserts (replaces) a node in place', () => {
    const graph = new RepositoryGraph();
    graph.upsertNode(node(fileNodeId('a.ts'), 'file', 'a.ts'));
    graph.upsertNode({
      id: fileNodeId('a.ts'),
      kind: 'file',
      name: 'a.ts',
      attributes: { path: 'a.ts' },
    });
    const found = graph.getNode(fileNodeId('a.ts'));
    if (found.some) {
      expect(found.value.attributes).toEqual({ path: 'a.ts' });
    }
    expect(graph.nodesByKind('file')).toHaveLength(1);
  });

  it('removes a node and its incident edges', () => {
    const graph = new RepositoryGraph();
    graph.upsertNode(node(packageNodeId('p'), 'package', 'p'));
    graph.upsertNode(node(fileNodeId('a.ts'), 'file', 'a.ts'));
    graph.upsertEdge({ from: packageNodeId('p'), to: fileNodeId('a.ts'), kind: 'contains' });

    graph.removeNode(fileNodeId('a.ts'));
    expect(graph.hasNode(fileNodeId('a.ts'))).toBe(false);
    expect(graph.edgesFrom(packageNodeId('p'))).toHaveLength(0);
  });

  it('is idempotent when upserting the same edge', () => {
    const graph = new RepositoryGraph();
    graph.upsertNode(node(packageNodeId('p'), 'package', 'p'));
    graph.upsertNode(node(fileNodeId('a.ts'), 'file', 'a.ts'));
    graph.upsertEdge({ from: packageNodeId('p'), to: fileNodeId('a.ts'), kind: 'contains' });
    graph.upsertEdge({ from: packageNodeId('p'), to: fileNodeId('a.ts'), kind: 'contains' });
    expect(graph.edges()).toHaveLength(1);
  });
});
