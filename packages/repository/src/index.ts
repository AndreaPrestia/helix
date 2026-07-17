/**
 * `@helix/repository` — the repository graph.
 *
 * Models packages, files, symbols, and tests as nodes with stable identifiers,
 * traceability edges to requirements and ADRs, incremental updates, and a
 * deterministic query API. Depends only on the provider-agnostic `@helix/core`.
 */

export {
  nodeKinds,
  edgeKinds,
  structuralEdgeKinds,
  isStructuralEdge,
  type NodeKind,
  type EdgeKind,
  type RepositoryNode,
  type RepositoryEdge,
} from './model.js';
export { packageNodeId, fileNodeId, symbolNodeId, testNodeId } from './ids.js';
export { RepositoryError, UnknownNodeError } from './errors.js';
export { RepositoryGraph } from './repository-graph.js';
export { ImpactAnalyzer, documentationAttribute, type ImpactReport } from './impact.js';
