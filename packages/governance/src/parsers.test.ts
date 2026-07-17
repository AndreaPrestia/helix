import { isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { parseChangeManifest } from './parse-manifest.js';
import { parseDelta } from './parse-delta.js';
import { parseSpec } from './parse-spec.js';

describe('parseSpec', () => {
  const markdown = [
    '# Demo Capability',
    '',
    '## Requirements',
    '',
    '### Requirement: first',
    'The system MUST do the first thing.',
    '',
    '### Requirement: second',
    'The system MUST do the second thing.',
    '',
    '## Non-goals',
    '- nothing',
  ].join('\n');

  it('parses the title and requirements', () => {
    const result = parseSpec('foundation/demo', markdown);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.title).toBe('Demo Capability');
      expect(result.value.requirements.map((r) => r.name)).toEqual(['first', 'second']);
      expect(result.value.requirements[0]?.text).toContain('first thing');
    }
  });

  it('fails when the title heading is missing', () => {
    expect(isErr(parseSpec('x', 'no title here'))).toBe(true);
  });
});

describe('parseDelta', () => {
  const markdown = [
    '# Delta',
    '## ADDED Requirements',
    '### Requirement: new-one',
    'MUST add this.',
    '## MODIFIED Requirements',
    'None until implementation reveals a correction.',
    '## REMOVED Requirements',
    'None.',
  ].join('\n');

  it('groups requirements by operation', () => {
    const result = parseDelta('foundation/demo', markdown);
    if (isOk(result)) {
      expect(result.value.requirements).toHaveLength(1);
      expect(result.value.requirements[0]).toMatchObject({ operation: 'added', name: 'new-one' });
    }
  });
});

describe('parseChangeManifest', () => {
  it('parses id, status, and dependencies', () => {
    const result = parseChangeManifest(
      'id: 0001-demo\nstatus: proposed\ndepends_on:\n  - 0000-base\n',
    );
    if (isOk(result)) {
      expect(result.value).toEqual({
        id: '0001-demo',
        status: 'proposed',
        dependsOn: ['0000-base'],
      });
    }
  });

  it('treats an empty dependency list as no dependencies', () => {
    const result = parseChangeManifest('id: x\nstatus: proposed\ndepends_on: []\n');
    if (isOk(result)) {
      expect(result.value.dependsOn).toEqual([]);
    }
  });

  it('fails when required fields are missing', () => {
    expect(isErr(parseChangeManifest('status: proposed\n'))).toBe(true);
  });
});
