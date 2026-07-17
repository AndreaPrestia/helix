import { type Option, type Result, err, fromNullable, ok } from '@helix/core';
import { UnknownNodeError } from './errors.js';
import {
  type EdgeKind,
  type NodeKind,
  type RepositoryEdge,
  type RepositoryNode,
  isStructuralEdge,
} from './model.js';

function edgeKey(edge: RepositoryEdge): string {
  return `${edge.from}\u0000${edge.kind}\u0000${edge.to}`;
}

/**
 * An in-memory repository graph of packages, files, symbols, and tests, with
 * traceability edges to requirements and ADRs. It supports incremental updates
 * (upsert/remove) and a deterministic query API — all queries return results in
 * a stable, id-sorted order.
 */
export class RepositoryGraph {
  readonly #nodes = new Map<string, RepositoryNode>();
  readonly #edges = new Map<string, RepositoryEdge>();

  /** Insert or replace a node by its stable id. */
  upsertNode(node: RepositoryNode): void {
    this.#nodes.set(node.id, node);
  }

  /** Remove a node and every edge that references it (as `from` or `to`). */
  removeNode(id: string): void {
    this.#nodes.delete(id);
    for (const [key, edge] of this.#edges) {
      if (edge.from === id || edge.to === id) {
        this.#edges.delete(key);
      }
    }
  }

  /**
   * Insert or replace an edge. The `from` node must exist; for structural edges
   * (`contains`/`tests`) the `to` node must also exist. Idempotent by
   * from/kind/to.
   */
  upsertEdge(edge: RepositoryEdge): Result<void, UnknownNodeError> {
    if (!this.#nodes.has(edge.from)) {
      return err(new UnknownNodeError(edge.from));
    }
    if (isStructuralEdge(edge.kind) && !this.#nodes.has(edge.to)) {
      return err(new UnknownNodeError(edge.to));
    }
    this.#edges.set(edgeKey(edge), edge);
    return ok(undefined);
  }

  /** Remove an edge if present. */
  removeEdge(edge: RepositoryEdge): void {
    this.#edges.delete(edgeKey(edge));
  }

  /** Whether a node exists. */
  hasNode(id: string): boolean {
    return this.#nodes.has(id);
  }

  /** Get a node by id. */
  getNode(id: string): Option<RepositoryNode> {
    return fromNullable(this.#nodes.get(id));
  }

  /** Every node, sorted by id. */
  nodes(): readonly RepositoryNode[] {
    return [...this.#nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Nodes of a given kind, sorted by id. */
  nodesByKind(kind: NodeKind): readonly RepositoryNode[] {
    return this.nodes().filter((node) => node.kind === kind);
  }

  /** Every edge, sorted by from/kind/to. */
  edges(): readonly RepositoryEdge[] {
    return [...this.#edges.values()].sort((a, b) => edgeKey(a).localeCompare(edgeKey(b)));
  }

  /** Edges originating from a node, optionally filtered by kind. */
  edgesFrom(id: string, kind?: EdgeKind): readonly RepositoryEdge[] {
    return this.edges().filter(
      (edge) => edge.from === id && (kind === undefined || edge.kind === kind),
    );
  }

  /** Resolve structural neighbors of a node (nodes reachable via existing edges). */
  neighbors(id: string, kind?: EdgeKind): readonly RepositoryNode[] {
    const seen = new Set<string>();
    const result: RepositoryNode[] = [];
    for (const edge of this.edgesFrom(id, kind)) {
      const node = this.#nodes.get(edge.to);
      if (node !== undefined && !seen.has(node.id)) {
        seen.add(node.id);
        result.push(node);
      }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }

  /** External requirement ids a node implements, sorted. */
  requirementLinks(id: string): readonly string[] {
    return this.#externalLinks(id, 'implements_requirement');
  }

  /** External ADR ids a node references, sorted. */
  adrLinks(id: string): readonly string[] {
    return this.#externalLinks(id, 'references_adr');
  }

  /** Nodes that implement a given requirement id, sorted by id. */
  nodesImplementing(requirementId: string): readonly RepositoryNode[] {
    return this.#nodesLinkingTo(requirementId, 'implements_requirement');
  }

  /** Nodes that reference a given ADR id, sorted by id. */
  nodesReferencingAdr(adrId: string): readonly RepositoryNode[] {
    return this.#nodesLinkingTo(adrId, 'references_adr');
  }

  #externalLinks(id: string, kind: EdgeKind): readonly string[] {
    return this.edgesFrom(id, kind)
      .map((edge) => edge.to)
      .sort((a, b) => a.localeCompare(b));
  }

  #nodesLinkingTo(target: string, kind: EdgeKind): readonly RepositoryNode[] {
    const result: RepositoryNode[] = [];
    for (const edge of this.edges()) {
      if (edge.kind === kind && edge.to === target) {
        const node = this.#nodes.get(edge.from);
        if (node !== undefined) {
          result.push(node);
        }
      }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }
}
