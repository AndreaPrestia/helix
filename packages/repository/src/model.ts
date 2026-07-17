/** Kinds of node in the repository graph. */
export const nodeKinds = ['package', 'file', 'symbol', 'test'] as const;
export type NodeKind = (typeof nodeKinds)[number];

/** A node in the repository graph, identified by a stable id. */
export interface RepositoryNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
}

/**
 * Kinds of edge. `contains`/`tests` connect two nodes; `implements_requirement`
 * and `references_adr` connect a node to an external requirement/ADR identifier
 * for traceability (Constitution Article 6).
 */
export const edgeKinds = ['contains', 'tests', 'implements_requirement', 'references_adr'] as const;
export type EdgeKind = (typeof edgeKinds)[number];

/** Edge kinds whose `to` must be an existing graph node. */
export const structuralEdgeKinds = ['contains', 'tests'] as const;

/** A directed edge in the repository graph. */
export interface RepositoryEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: EdgeKind;
}

/** Whether an edge kind connects two graph nodes (rather than an external ref). */
export function isStructuralEdge(kind: EdgeKind): boolean {
  return (structuralEdgeKinds as readonly EdgeKind[]).includes(kind);
}
