import { type Result, err, ok } from '@helix/core';
import { ChangeValidationError, DeltaConflictError } from './errors.js';
import type {
  ArchiveOutcome,
  BaselineSpec,
  ChangeStructure,
  DeltaSpec,
  SpecRequirement,
} from './model.js';
import { validateChangeStructure } from './validate.js';

/**
 * Apply a delta to a baseline spec. `added` requirements must not already exist;
 * `modified` and `removed` requirements must exist. Returns a new spec, leaving
 * the input unchanged.
 */
export function applyDelta(
  baseline: BaselineSpec,
  delta: DeltaSpec,
): Result<BaselineSpec, DeltaConflictError> {
  const requirements: SpecRequirement[] = [...baseline.requirements];

  for (const change of delta.requirements) {
    const index = requirements.findIndex((requirement) => requirement.name === change.name);
    switch (change.operation) {
      case 'added':
        if (index >= 0) {
          return err(
            new DeltaConflictError(delta.capability, `requirement already exists: ${change.name}`),
          );
        }
        requirements.push({ name: change.name, text: change.text });
        break;
      case 'modified':
        if (index < 0) {
          return err(
            new DeltaConflictError(
              delta.capability,
              `cannot modify missing requirement: ${change.name}`,
            ),
          );
        }
        requirements[index] = { name: change.name, text: change.text };
        break;
      case 'removed':
        if (index < 0) {
          return err(
            new DeltaConflictError(
              delta.capability,
              `cannot remove missing requirement: ${change.name}`,
            ),
          );
        }
        requirements.splice(index, 1);
        break;
    }
  }

  return ok({ ...baseline, requirements });
}

/**
 * Archive an accepted change: validate its structure, merge every delta into the
 * matching baseline spec (creating a new spec for a new capability), and return
 * the archived id plus the updated baseline specs. Never mutates the inputs.
 */
export function archiveChange(
  change: ChangeStructure,
  baselines: readonly BaselineSpec[],
): Result<ArchiveOutcome, ChangeValidationError | DeltaConflictError> {
  const validated = validateChangeStructure(change);
  if (!validated.ok) {
    return validated;
  }

  const specs = new Map<string, BaselineSpec>(baselines.map((spec) => [spec.capability, spec]));
  for (const delta of change.deltas) {
    const existing =
      specs.get(delta.capability) ??
      ({
        capability: delta.capability,
        title: delta.capability,
        requirements: [],
      } satisfies BaselineSpec);
    const applied = applyDelta(existing, delta);
    if (!applied.ok) {
      return applied;
    }
    specs.set(delta.capability, applied.value);
  }

  const updatedSpecs = [...specs.values()].sort((a, b) => a.capability.localeCompare(b.capability));
  return ok({ archivedChangeId: change.id, updatedSpecs });
}
