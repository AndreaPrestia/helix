import type {
  EdgeKind,
  ImpactReport,
  NodeKind,
  RepositoryGraph,
  RepositoryNode,
} from '@helix/repository';
import { ImpactAnalyzer, edgeKinds, nodeKinds } from '@helix/repository';
import { isErr } from '@helix/core';
import {
  ExitCode,
  type Command,
  type CommandContext,
  type CommandResult,
  type Diagnostic,
} from '../command.js';

/** The default number of results returned by a listing query. */
export const DEFAULT_QUERY_LIMIT = 100;
/** The hard upper bound on results and seed ids, enforcing bounded complexity. */
export const MAX_QUERY_LIMIT = 1000;

/** The projectable fields of a repository node. */
export const PROJECTION_FIELDS = ['id', 'kind', 'name', 'attributes'] as const;
export type ProjectionField = (typeof PROJECTION_FIELDS)[number];

/** The kind of query being run. */
export type QueryKind = 'nodes' | 'node' | 'neighbors' | 'implements' | 'adr' | 'impact';
const QUERY_KINDS: readonly QueryKind[] = [
  'nodes',
  'node',
  'neighbors',
  'implements',
  'adr',
  'impact',
];

/** A source of the repository graph, injected so the command is testable. */
export interface GraphSource {
  load(): RepositoryGraph;
}

function diagnostic(code: string, message: string): Diagnostic {
  return { severity: 'error', code, message };
}

function usage(code: string, message: string): CommandResult {
  return { exitCode: ExitCode.usage, diagnostics: [diagnostic(code, message)] };
}

function failure(code: string, message: string): CommandResult {
  return { exitCode: ExitCode.error, diagnostics: [diagnostic(code, message)] };
}

function readString(flags: CommandContext['flags'], key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

/** Parse and bound the `--limit` flag. Returns a number, or `null` when invalid. */
export function parseLimit(raw: string | undefined): number | null {
  if (raw === undefined) {
    return DEFAULT_QUERY_LIMIT;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_QUERY_LIMIT) {
    return null;
  }
  return value;
}

/** Parse the `--select` projection list. Returns fields, or `null` on an unknown field. */
export function parseProjection(raw: string | undefined): readonly ProjectionField[] | null {
  if (raw === undefined) {
    return PROJECTION_FIELDS;
  }
  const requested = raw
    .split(',')
    .map((field) => field.trim())
    .filter((field) => field !== '');
  for (const field of requested) {
    if (!(PROJECTION_FIELDS as readonly string[]).includes(field)) {
      return null;
    }
  }
  return requested as readonly ProjectionField[];
}

/** Project a node down to the selected fields. */
export function projectNode(
  node: RepositoryNode,
  fields: readonly ProjectionField[],
): Record<string, unknown> {
  const projected: Record<string, unknown> = {};
  for (const field of fields) {
    projected[field] = node[field];
  }
  return projected;
}

interface NodeListResult {
  readonly nodes: readonly Record<string, unknown>[];
  readonly truncated: boolean;
  readonly total: number;
}

function listResult(
  nodes: readonly RepositoryNode[],
  limit: number,
  fields: readonly ProjectionField[],
): NodeListResult {
  const limited = nodes.slice(0, limit);
  return {
    nodes: limited.map((node) => projectNode(node, fields)),
    truncated: nodes.length > limit,
    total: nodes.length,
  };
}

function renderNodes(result: NodeListResult): string {
  const lines = result.nodes.map((node) => JSON.stringify(node));
  lines.push(
    result.truncated
      ? `showing ${result.nodes.length} of ${result.total} (limit reached)`
      : `${result.total} result(s)`,
  );
  return lines.join('\n');
}

function nodeListCommandResult(result: NodeListResult, json: boolean): CommandResult {
  const diagnostics: Diagnostic[] = result.truncated
    ? [
        {
          severity: 'warning',
          code: 'QUERY_TRUNCATED',
          message: `result truncated to ${result.nodes.length} of ${result.total}; raise --limit (max ${MAX_QUERY_LIMIT})`,
        },
      ]
    : [];
  return {
    exitCode: ExitCode.success,
    output: json ? result : renderNodes(result),
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  };
}

/**
 * `helix query` — deterministic, bounded queries over the repository graph.
 * Supports node listing (with kind filter and field projection), single-node
 * lookup, structural neighbors, requirement/ADR traceability, and impact
 * analysis. Every listing is bounded by `--limit` (max {@link MAX_QUERY_LIMIT});
 * results are id-sorted; and errors surface clear diagnostics rather than
 * concealing partial failure (Constitution Article 7).
 */
export function createQueryCommand(source: GraphSource): Command {
  return {
    name: 'query',
    description: 'query the repository graph (nodes, neighbors, traceability, impact)',
    run(context: CommandContext): CommandResult {
      const [kindArg, ...targets] = context.args;
      if (kindArg === undefined) {
        return usage(
          'QUERY_MISSING_KIND',
          `missing query kind; expected one of: ${QUERY_KINDS.join(', ')}`,
        );
      }
      if (!(QUERY_KINDS as readonly string[]).includes(kindArg)) {
        return usage(
          'QUERY_UNKNOWN_KIND',
          `unknown query kind "${kindArg}"; expected one of: ${QUERY_KINDS.join(', ')}`,
        );
      }
      const kind = kindArg as QueryKind;

      const json = context.flags['json'] === true;
      const limit = parseLimit(readString(context.flags, 'limit'));
      if (limit === null) {
        return usage(
          'QUERY_INVALID_LIMIT',
          `--limit must be an integer between 1 and ${MAX_QUERY_LIMIT}`,
        );
      }
      const fields = parseProjection(readString(context.flags, 'select'));
      if (fields === null) {
        return usage(
          'QUERY_INVALID_SELECT',
          `--select fields must be among: ${PROJECTION_FIELDS.join(', ')}`,
        );
      }

      const graph = source.load();
      const kindFlag = readString(context.flags, 'kind');

      switch (kind) {
        case 'nodes': {
          if (kindFlag !== undefined && !(nodeKinds as readonly string[]).includes(kindFlag)) {
            return usage(
              'QUERY_INVALID_NODE_KIND',
              `--kind must be one of: ${nodeKinds.join(', ')}`,
            );
          }
          const nodes =
            kindFlag === undefined ? graph.nodes() : graph.nodesByKind(kindFlag as NodeKind);
          return nodeListCommandResult(listResult(nodes, limit, fields), json);
        }
        case 'node': {
          const id = targets[0];
          if (id === undefined) {
            return usage('QUERY_MISSING_ARG', 'query "node" requires a node id');
          }
          const node = graph.getNode(id);
          if (!node.some) {
            return failure('QUERY_UNKNOWN_NODE', `no node with id "${id}"`);
          }
          return { exitCode: ExitCode.success, output: projectNode(node.value, fields) };
        }
        case 'neighbors': {
          const id = targets[0];
          if (id === undefined) {
            return usage('QUERY_MISSING_ARG', 'query "neighbors" requires a node id');
          }
          if (kindFlag !== undefined && !(edgeKinds as readonly string[]).includes(kindFlag)) {
            return usage(
              'QUERY_INVALID_EDGE_KIND',
              `--kind must be one of: ${edgeKinds.join(', ')}`,
            );
          }
          if (!graph.hasNode(id)) {
            return failure('QUERY_UNKNOWN_NODE', `no node with id "${id}"`);
          }
          const nodes = graph.neighbors(id, kindFlag as EdgeKind | undefined);
          return nodeListCommandResult(listResult(nodes, limit, fields), json);
        }
        case 'implements': {
          const requirementId = targets[0];
          if (requirementId === undefined) {
            return usage('QUERY_MISSING_ARG', 'query "implements" requires a requirement id');
          }
          const nodes = graph.nodesImplementing(requirementId);
          return nodeListCommandResult(listResult(nodes, limit, fields), json);
        }
        case 'adr': {
          const adrId = targets[0];
          if (adrId === undefined) {
            return usage('QUERY_MISSING_ARG', 'query "adr" requires an ADR id');
          }
          const nodes = graph.nodesReferencingAdr(adrId);
          return nodeListCommandResult(listResult(nodes, limit, fields), json);
        }
        case 'impact': {
          if (targets.length === 0) {
            return usage('QUERY_MISSING_ARG', 'query "impact" requires at least one node id');
          }
          if (targets.length > MAX_QUERY_LIMIT) {
            return usage('QUERY_TOO_MANY_SEEDS', `too many seed ids (max ${MAX_QUERY_LIMIT})`);
          }
          const report = new ImpactAnalyzer(graph).analyze(targets);
          if (isErr(report)) {
            return failure('QUERY_UNKNOWN_NODE', report.error.message);
          }
          return { exitCode: ExitCode.success, output: renderImpact(report.value, json) };
        }
      }
    },
  };
}

function renderImpact(report: ImpactReport, json: boolean): unknown {
  if (json) {
    return report;
  }
  return [
    `changed:        ${report.changedNodes.join(', ') || '(none)'}`,
    `impacted:       ${report.impactedNodes.join(', ') || '(none)'}`,
    `requirements:   ${report.affectedRequirements.join(', ') || '(none)'}`,
    `decisions:      ${report.affectedDecisions.join(', ') || '(none)'}`,
    `tests to run:   ${report.recommendedTests.join(', ') || '(none)'}`,
    `docs impacted:  ${report.documentationImpact.join(', ') || '(none)'}`,
  ].join('\n');
}
