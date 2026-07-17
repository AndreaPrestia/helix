import { type Result, err, ok } from '@helix/core';
import { ChangeValidationError } from './errors.js';
import type { ChangeStructure } from './model.js';

/**
 * Validate a change's structure: manifest id matches the directory, proposal and
 * tasks are present, at least one delta exists, and every delta requirement is
 * named. All issues are collected and reported together.
 */
export function validateChangeStructure(
  change: ChangeStructure,
): Result<ChangeStructure, ChangeValidationError> {
  const issues: string[] = [];

  if (change.manifest.id !== change.id) {
    issues.push(`manifest id "${change.manifest.id}" does not match directory "${change.id}"`);
  }
  if (!change.hasProposal) {
    issues.push('missing proposal.md');
  }
  if (!change.hasTasks) {
    issues.push('missing tasks.md');
  }
  if (change.deltas.length === 0) {
    issues.push('no delta specifications');
  }
  for (const delta of change.deltas) {
    for (const requirement of delta.requirements) {
      if (requirement.name.trim() === '') {
        issues.push(`delta "${delta.capability}" has an unnamed requirement`);
      }
    }
  }

  if (issues.length > 0) {
    return err(new ChangeValidationError(change.id, issues));
  }
  return ok(change);
}
