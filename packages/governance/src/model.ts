/** A single normative requirement within a baseline specification. */
export interface SpecRequirement {
  readonly name: string;
  readonly text: string;
}

/** A baseline specification for one capability. */
export interface BaselineSpec {
  /** Capability path, e.g. `foundation/workspace-bootstrap`. */
  readonly capability: string;
  readonly title: string;
  readonly requirements: readonly SpecRequirement[];
}

/** The kind of change a delta requirement expresses. */
export type DeltaOperation = 'added' | 'modified' | 'removed';

/** A single requirement change within a delta. */
export interface DeltaRequirement {
  readonly operation: DeltaOperation;
  readonly name: string;
  readonly text: string;
}

/** A delta specification targeting one capability. */
export interface DeltaSpec {
  readonly capability: string;
  readonly requirements: readonly DeltaRequirement[];
}

/** Parsed `change.yaml` metadata. */
export interface ChangeManifest {
  readonly id: string;
  readonly status: string;
  readonly dependsOn: readonly string[];
}

/** A discovered change with its structure. */
export interface ChangeStructure {
  readonly id: string;
  readonly manifest: ChangeManifest;
  readonly hasProposal: boolean;
  readonly hasTasks: boolean;
  readonly deltas: readonly DeltaSpec[];
}

/** The outcome of archiving an accepted change. */
export interface ArchiveOutcome {
  readonly archivedChangeId: string;
  /** Baseline specs after the change's deltas have been merged. */
  readonly updatedSpecs: readonly BaselineSpec[];
}
