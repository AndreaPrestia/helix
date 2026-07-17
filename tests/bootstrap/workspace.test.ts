import { describe, expect, it } from 'vitest';
import { readJson, readYaml } from '../support/repo.js';

interface RootPackageJson {
  readonly private?: boolean;
  readonly type?: string;
  readonly packageManager?: string;
  readonly scripts?: Record<string, string>;
}

interface PnpmWorkspace {
  readonly packages?: readonly string[];
}

interface TurboConfig {
  readonly tasks?: Record<string, unknown>;
}

describe('pnpm workspace configuration', () => {
  const pkg = readJson<RootPackageJson>('package.json');
  const workspace = readYaml<PnpmWorkspace>('pnpm-workspace.yaml');

  it('declares a private ESM root package managed by pnpm', () => {
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe('module');
    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
  });

  it('enumerates the workspace package globs deterministically', () => {
    expect(workspace.packages).toEqual(['apps/*', 'packages/*', 'plugins/*']);
  });
});

describe('Turborepo configuration', () => {
  const turbo = readJson<TurboConfig>('turbo.json');

  it('defines the orchestrated build pipeline tasks', () => {
    const tasks = turbo.tasks ?? {};
    for (const task of ['build', 'typecheck', 'lint', 'test']) {
      expect(Object.keys(tasks)).toContain(task);
    }
  });
});
