import { type Result, err, ok } from '@helix/core';
import { ParseError } from './errors.js';
import type { BaselineSpec, SpecRequirement } from './model.js';

const REQUIREMENT_HEADING = /^###\s+Requirement:\s*(.+)$/;
const HEADING = /^#{1,3}\s+/;

/** Parse a baseline specification markdown document. */
export function parseSpec(capability: string, markdown: string): Result<BaselineSpec, ParseError> {
  const lines = markdown.split('\n');
  const titleLine = lines.find((line) => line.startsWith('# '));
  if (titleLine === undefined) {
    return err(new ParseError(capability, 'missing "# " title heading'));
  }

  const requirements: SpecRequirement[] = [];
  let current: { name: string; body: string[] } | null = null;
  const flush = (): void => {
    if (current !== null) {
      requirements.push({ name: current.name, text: current.body.join('\n').trim() });
      current = null;
    }
  };

  for (const line of lines) {
    const match = REQUIREMENT_HEADING.exec(line);
    if (match) {
      flush();
      current = { name: (match[1] ?? '').trim(), body: [] };
      continue;
    }
    if (HEADING.test(line)) {
      flush();
      continue;
    }
    if (current !== null) {
      current.body.push(line);
    }
  }
  flush();

  return ok({ capability, title: titleLine.slice(2).trim(), requirements });
}
