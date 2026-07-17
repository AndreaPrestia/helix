import { DomainError } from '@helix/core';

/** Base class for repository-graph failures. */
export abstract class RepositoryError extends DomainError {}

/** Raised when an edge references a node that does not exist in the graph. */
export class UnknownNodeError extends RepositoryError {
  readonly code = 'REPO_UNKNOWN_NODE';

  constructor(readonly nodeId: string) {
    super(`unknown node: ${nodeId}`);
  }
}
