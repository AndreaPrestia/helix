import { describe, expect, it } from 'vitest';
import { readJson } from '../support/repo.js';

interface TsConfig {
  readonly extends?: string;
  readonly compilerOptions?: Record<string, unknown>;
}

describe('strict TypeScript base configuration', () => {
  const base = readJson<TsConfig>('tsconfig.base.json');
  const options = base.compilerOptions ?? {};

  it('enables every strictness flag required by the technology baseline', () => {
    const requiredTrueFlags = [
      'strict',
      'noUncheckedIndexedAccess',
      'exactOptionalPropertyTypes',
      'noImplicitOverride',
      'verbatimModuleSyntax',
    ] as const;

    for (const flag of requiredTrueFlags) {
      expect(options[flag], `${flag} must be enabled`).toBe(true);
    }
  });

  it('targets native ESM with NodeNext resolution', () => {
    expect(options['module']).toBe('NodeNext');
    expect(options['moduleResolution']).toBe('NodeNext');
  });
});

describe('root TypeScript project', () => {
  const root = readJson<TsConfig>('tsconfig.json');

  it('extends the shared strict base configuration', () => {
    expect(root.extends).toBe('./tsconfig.base.json');
  });
});
