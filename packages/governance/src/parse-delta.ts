import { type Result, ok } from '@helix/core';
import type { ParseError } from './errors.js';
import type { DeltaOperation, DeltaRequirement, DeltaSpec } from './model.js';

const SECTION_HEADING = /^##\s+(ADDED|MODIFIED|REMOVED)\s+Requirements/i;
const OTHER_SECTION = /^##\s+/;
const REQUIREMENT_HEADING = /^###\s+Requirement:\s*(.+)$/;

/** Parse a delta specification markdown document. */
export function parseDelta(capability: string, markdown: string): Result<DeltaSpec, ParseError> {
  const lines = markdown.split('\n');
  const requirements: DeltaRequirement[] = [];
  let operation: DeltaOperation | null = null;
  let current: { name: string; body: string[] } | null = null;

  const flush = (): void => {
    if (current !== null && operation !== null) {
      requirements.push({ operation, name: current.name, text: current.body.join('\n').trim() });
    }
    current = null;
  };

  for (const line of lines) {
    const section = SECTION_HEADING.exec(line);
    if (section) {
      flush();
      operation = (section[1] ?? '').toLowerCase() as DeltaOperation;
      continue;
    }
    if (OTHER_SECTION.test(line)) {
      flush();
      operation = null;
      continue;
    }
    const requirement = REQUIREMENT_HEADING.exec(line);
    if (requirement) {
      flush();
      current = { name: (requirement[1] ?? '').trim(), body: [] };
      continue;
    }
    if (current !== null) {
      current.body.push(line);
    }
  }
  flush();

  return ok({ capability, requirements });
}
