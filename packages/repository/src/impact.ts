import { type Result, err, ok } from '@helix/core';
import { UnknownNodeError } from './errors.js';
import { isStructuralEdge } from './model.js';
import type { RepositoryGraph } from './repository-graph.js';

/**
 * The node attribute marking a file as documentation. File nodes carrying
 * `{ [documentationAttribute]: 'true' }` participate in documentation-impact
 * analysis.
 */
export const documentationAttribute = 'documentation';

/** The deterministic result of analyzing the impact of a set of changed nodes. */
export interface ImpactReport {
  /** The changed node ids that were analyzed (sorted). */
  readonly changedNodes: readonly string[];
  /** Changed nodes plus every node structurally affected by them (sorted). */
  readonly impactedNodes: readonly string[];
  /** Requirement ids linked from impacted nodes (sorted). */
  readonly affectedRequirements: readonly string[];
  /** ADR ids linked from impacted nodes (sorted). */
  readonly affectedDecisions: readonly string[];
  /** Impacted test node ids that should be re-run (sorted). */
  readonly recommendedTests: readonly string[];
  /** Documentation file node ids whose subject is affected (sorted). */
  readonly documentationImpact: readonly string[];
}

/**
 * Computes change impact over a {@link RepositoryGraph}. Impact propagates along
 * reverse structural edges (a changed symbol impacts the file and package that
 * contain it and the tests that exercise it). All outputs are deterministic and
 * id-sorted.
 */
export class ImpactAnalyzer {
  readonly #graph: RepositoryGraph;

  constructor(graph: RepositoryGraph) {
    this.#graph = graph;
  }

  analyze(changedNodeIds: readonly string[]): Result<ImpactReport, UnknownNodeError> {
    for (const id of changedNodeIds) {
      if (!this.#graph.hasNode(id)) {
        return err(new UnknownNodeError(id));
      }
    }

    const predecessors = new Map<string, string[]>();
    for (const edge of this.#graph.edges()) {
      if (isStructuralEdge(edge.kind)) {
        const list = predecessors.get(edge.to) ?? [];
        list.push(edge.from);
        predecessors.set(edge.to, list);
      }
    }

    const impacted = new Set<string>(changedNodeIds);
    const queue = [...changedNodeIds];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) {
        break;
      }
      for (const predecessor of predecessors.get(current) ?? []) {
        if (!impacted.has(predecessor)) {
          impacted.add(predecessor);
          queue.push(predecessor);
        }
      }
    }

    const affectedRequirements = new Set<string>();
    const affectedDecisions = new Set<string>();
    const recommendedTests = new Set<string>();

    for (const id of impacted) {
      for (const edge of this.#graph.edgesFrom(id, 'implements_requirement')) {
        affectedRequirements.add(edge.to);
      }
      for (const edge of this.#graph.edgesFrom(id, 'references_adr')) {
        affectedDecisions.add(edge.to);
      }
      const node = this.#graph.getNode(id);
      if (node.some && node.value.kind === 'test') {
        recommendedTests.add(id);
      }
    }

    const documentationImpact = new Set<string>();
    for (const node of this.#graph.nodesByKind('file')) {
      if (node.attributes[documentationAttribute] !== 'true') {
        continue;
      }
      const structurallyImpacted = impacted.has(node.id);
      const linksAffected = this.#graph
        .edgesFrom(node.id)
        .some(
          (edge) =>
            (edge.kind === 'implements_requirement' && affectedRequirements.has(edge.to)) ||
            (edge.kind === 'references_adr' && affectedDecisions.has(edge.to)),
        );
      if (structurallyImpacted || linksAffected) {
        documentationImpact.add(node.id);
      }
    }

    return ok({
      changedNodes: [...changedNodeIds].sort((a, b) => a.localeCompare(b)),
      impactedNodes: [...impacted].sort((a, b) => a.localeCompare(b)),
      affectedRequirements: [...affectedRequirements].sort((a, b) => a.localeCompare(b)),
      affectedDecisions: [...affectedDecisions].sort((a, b) => a.localeCompare(b)),
      recommendedTests: [...recommendedTests].sort((a, b) => a.localeCompare(b)),
      documentationImpact: [...documentationImpact].sort((a, b) => a.localeCompare(b)),
    });
  }
}
