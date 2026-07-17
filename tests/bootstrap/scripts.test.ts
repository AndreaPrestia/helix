import { describe, expect, it } from 'vitest';
import { readJson } from '../support/repo.js';

interface RootPackageJson {
  readonly scripts?: Record<string, string>;
}

describe('build, typecheck, lint and test scripts', () => {
  const scripts = readJson<RootPackageJson>('package.json').scripts ?? {};

  it('exposes every quality-gate script the verification protocol runs', () => {
    const required: Record<string, RegExp> = {
      build: /turbo run build/,
      typecheck: /tsc/,
      lint: /eslint/,
      test: /vitest run/,
      'architecture:test': /vitest run tests\/architecture/,
      'format:check': /prettier --check/,
      format: /prettier --write/,
    };

    for (const [name, pattern] of Object.entries(required)) {
      expect(scripts[name], `script ${name} must be defined`).toBeDefined();
      expect(scripts[name]).toMatch(pattern);
    }
  });
});
