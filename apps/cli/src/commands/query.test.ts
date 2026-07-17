import { describe, expect, it } from 'vitest';
import { none } from '@helix/core';
import { RepositoryGraph, type RepositoryNode } from '@helix/repository';
import {
  DEFAULT_QUERY_LIMIT,
  MAX_QUERY_LIMIT,
  createQueryCommand,
  parseLimit,
  parseProjection,
  projectNode,
  type GraphSource,
} from './query.js';
import { ExitCode, type CliIo, type CommandContext, type CommandResult } from '../command.js';

const io: CliIo = { writeOut: () => {}, writeErr: () => {} };

function context(
  args: readonly string[],
  flags: Record<string, string | boolean> = {},
): CommandContext {
  return { args, flags, config: none(), io };
}

function node(id: string, kind: RepositoryNode['kind'], name: string): RepositoryNode {
  return { id, kind, name, attributes: {} };
}

function sampleGraph(): RepositoryGraph {
  const graph = new RepositoryGraph();
  graph.upsertNode(node('pkg:a', 'package', 'a'));
  graph.upsertNode(node('file:a/x.ts', 'file', 'x.ts'));
  graph.upsertNode(node('sym:foo', 'symbol', 'foo'));
  graph.upsertNode(node('test:x', 'test', 'x.test'));
  graph.upsertEdge({ from: 'pkg:a', to: 'file:a/x.ts', kind: 'contains' });
  graph.upsertEdge({ from: 'file:a/x.ts', to: 'sym:foo', kind: 'contains' });
  graph.upsertEdge({ from: 'test:x', to: 'sym:foo', kind: 'tests' });
  graph.upsertEdge({ from: 'sym:foo', to: 'REQ-1', kind: 'implements_requirement' });
  graph.upsertEdge({ from: 'sym:foo', to: 'ADR-1', kind: 'references_adr' });
  return graph;
}

function source(graph: RepositoryGraph): GraphSource {
  return { load: () => graph };
}

// `query` runs synchronously; narrow the declared union for terse assertions.
function run(args: readonly string[], flags: Record<string, string | boolean> = {}): CommandResult {
  return createQueryCommand(source(sampleGraph())).run(context(args, flags)) as CommandResult;
}

describe('parseLimit', () => {
  it('defaults when absent', () => {
    expect(parseLimit(undefined)).toBe(DEFAULT_QUERY_LIMIT);
  });
  it('accepts an in-range integer', () => {
    expect(parseLimit('10')).toBe(10);
  });
  it('rejects zero, negatives, non-integers, and over-max', () => {
    expect(parseLimit('0')).toBeNull();
    expect(parseLimit('-1')).toBeNull();
    expect(parseLimit('1.5')).toBeNull();
    expect(parseLimit(String(MAX_QUERY_LIMIT + 1))).toBeNull();
  });
});

describe('parseProjection', () => {
  it('defaults to all fields', () => {
    expect(parseProjection(undefined)).toEqual(['id', 'kind', 'name', 'attributes']);
  });
  it('parses a subset', () => {
    expect(parseProjection('id,name')).toEqual(['id', 'name']);
  });
  it('rejects an unknown field', () => {
    expect(parseProjection('id,bogus')).toBeNull();
  });
});

describe('projectNode', () => {
  it('projects only the selected fields', () => {
    expect(projectNode(node('sym:foo', 'symbol', 'foo'), ['id', 'name'])).toEqual({
      id: 'sym:foo',
      name: 'foo',
    });
  });
});

describe('query command dispatch', () => {
  it('errors on a missing kind', () => {
    const result = run([]);
    expect(result.exitCode).toBe(ExitCode.usage);
    expect(result.diagnostics?.[0]?.code).toBe('QUERY_MISSING_KIND');
  });

  it('errors on an unknown kind', () => {
    const result = run(['bogus']);
    expect(result.exitCode).toBe(ExitCode.usage);
    expect(result.diagnostics?.[0]?.code).toBe('QUERY_UNKNOWN_KIND');
  });

  it('rejects an invalid limit', () => {
    expect(run(['nodes'], { limit: '0' }).diagnostics?.[0]?.code).toBe('QUERY_INVALID_LIMIT');
  });

  it('rejects an invalid select field', () => {
    expect(run(['nodes'], { select: 'bogus' }).diagnostics?.[0]?.code).toBe('QUERY_INVALID_SELECT');
  });
});

describe('query nodes', () => {
  it('lists all nodes id-sorted as JSON', () => {
    const result = run(['nodes'], { json: true, select: 'id' });
    expect(result.exitCode).toBe(ExitCode.success);
    expect(result.output).toEqual({
      nodes: [{ id: 'file:a/x.ts' }, { id: 'pkg:a' }, { id: 'sym:foo' }, { id: 'test:x' }],
      truncated: false,
      total: 4,
    });
  });

  it('filters by node kind', () => {
    const result = run(['nodes'], { json: true, kind: 'package', select: 'id' });
    expect(result.output).toMatchObject({ nodes: [{ id: 'pkg:a' }], total: 1 });
  });

  it('rejects an invalid node kind', () => {
    expect(run(['nodes'], { kind: 'bogus' }).diagnostics?.[0]?.code).toBe(
      'QUERY_INVALID_NODE_KIND',
    );
  });

  it('truncates and warns when the limit is exceeded', () => {
    const result = run(['nodes'], { json: true, limit: '2' });
    expect(result.output).toMatchObject({ truncated: true, total: 4 });
    expect(result.diagnostics?.[0]?.code).toBe('QUERY_TRUNCATED');
    expect(result.diagnostics?.[0]?.severity).toBe('warning');
  });
});

describe('query node', () => {
  it('returns a single node', () => {
    expect(run(['node', 'sym:foo'], { select: 'id,kind' }).output).toEqual({
      id: 'sym:foo',
      kind: 'symbol',
    });
  });

  it('requires an id', () => {
    expect(run(['node']).diagnostics?.[0]?.code).toBe('QUERY_MISSING_ARG');
  });

  it('errors clearly on an unknown node', () => {
    const result = run(['node', 'sym:missing']);
    expect(result.exitCode).toBe(ExitCode.error);
    expect(result.diagnostics?.[0]?.code).toBe('QUERY_UNKNOWN_NODE');
  });
});

describe('query neighbors', () => {
  it('returns structural neighbors filtered by edge kind', () => {
    const result = run(['neighbors', 'pkg:a'], { json: true, kind: 'contains', select: 'id' });
    expect(result.output).toMatchObject({ nodes: [{ id: 'file:a/x.ts' }] });
  });

  it('rejects an invalid edge kind', () => {
    expect(run(['neighbors', 'pkg:a'], { kind: 'bogus' }).diagnostics?.[0]?.code).toBe(
      'QUERY_INVALID_EDGE_KIND',
    );
  });

  it('errors on an unknown node', () => {
    expect(run(['neighbors', 'pkg:missing']).diagnostics?.[0]?.code).toBe('QUERY_UNKNOWN_NODE');
  });
});

describe('query traceability', () => {
  it('lists nodes implementing a requirement', () => {
    expect(run(['implements', 'REQ-1'], { json: true, select: 'id' }).output).toMatchObject({
      nodes: [{ id: 'sym:foo' }],
    });
  });

  it('lists nodes referencing an ADR', () => {
    expect(run(['adr', 'ADR-1'], { json: true, select: 'id' }).output).toMatchObject({
      nodes: [{ id: 'sym:foo' }],
    });
  });
});

describe('query impact', () => {
  it('reports the impact of a changed node', () => {
    const result = run(['impact', 'sym:foo'], { json: true });
    expect(result.exitCode).toBe(ExitCode.success);
    expect(result.output).toMatchObject({
      changedNodes: ['sym:foo'],
      affectedRequirements: ['REQ-1'],
      affectedDecisions: ['ADR-1'],
      recommendedTests: ['test:x'],
    });
    expect(result.output).toHaveProperty('impactedNodes');
  });

  it('requires at least one id', () => {
    expect(run(['impact']).diagnostics?.[0]?.code).toBe('QUERY_MISSING_ARG');
  });

  it('errors on an unknown seed node', () => {
    const result = run(['impact', 'sym:missing']);
    expect(result.exitCode).toBe(ExitCode.error);
    expect(result.diagnostics?.[0]?.code).toBe('QUERY_UNKNOWN_NODE');
  });
});
