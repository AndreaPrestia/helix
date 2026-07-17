import { type Result, err, ok } from '@helix/core';
import { parse as parseYaml } from 'yaml';
import { ParseError } from './errors.js';
import type { ChangeManifest } from './model.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parse a `change.yaml` manifest. */
export function parseChangeManifest(source: string): Result<ChangeManifest, ParseError> {
  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch {
    return err(new ParseError('change.yaml', 'invalid YAML'));
  }
  if (!isRecord(raw)) {
    return err(new ParseError('change.yaml', 'expected a mapping'));
  }
  if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    return err(new ParseError('change.yaml', 'missing "id"'));
  }
  if (typeof raw.status !== 'string' || raw.status.trim() === '') {
    return err(new ParseError('change.yaml', 'missing "status"'));
  }

  const dependsOnRaw = raw.depends_on;
  let dependsOn: string[];
  if (dependsOnRaw === undefined || dependsOnRaw === null) {
    dependsOn = [];
  } else if (
    Array.isArray(dependsOnRaw) &&
    dependsOnRaw.every((item) => typeof item === 'string')
  ) {
    dependsOn = dependsOnRaw as string[];
  } else {
    return err(new ParseError('change.yaml', '"depends_on" must be a list of strings'));
  }

  return ok({ id: raw.id, status: raw.status, dependsOn });
}
