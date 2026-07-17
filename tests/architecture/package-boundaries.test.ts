import { describe, expect, it } from 'vitest';
import type { DependencyRules, PackageModel } from './checker/model.js';
import {
  checkAcyclicDependencyGraph,
  checkDeclaredResponsibilities,
  checkDomainIsolation,
  checkForbiddenDeepImports,
  checkPublicEntryPoints,
  runAllChecks,
} from './checker/rules.js';

const rules: DependencyRules = {
  packages: {
    core: [],
    events: ['@helix/core'],
    application: ['@helix/core', '@helix/events'],
  },
  rules: {
    noCycles: true,
    noDeepImports: true,
    coreInfrastructureImports: [],
    pluginsMayDependOnPlugins: false,
  },
};

function pkg(
  name: string,
  key: string,
  overrides: Partial<Omit<PackageModel, 'name' | 'key'>> = {},
): PackageModel {
  return {
    name,
    key,
    group: overrides.group ?? 'packages',
    hasPublicIndex: overrides.hasPublicIndex ?? true,
    exportsRootOnly: overrides.exportsRootOnly ?? true,
    imports: overrides.imports ?? [],
  };
}

describe('declared package responsibilities', () => {
  it('accepts packages declared in the ruleset', () => {
    expect(checkDeclaredResponsibilities([pkg('@helix/core', 'core')], rules)).toEqual([]);
  });

  it('rejects an undeclared package', () => {
    const violations = checkDeclaredResponsibilities([pkg('@helix/mystery', 'mystery')], rules);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe('declared-responsibilities');
  });

  it('exempts apps and plugins (composition roots / extensions)', () => {
    expect(
      checkDeclaredResponsibilities([pkg('@helix/cli', 'cli', { group: 'apps' })], rules),
    ).toEqual([]);
    expect(
      checkDeclaredResponsibilities(
        [pkg('@helix/some-plugin', 'some-plugin', { group: 'plugins' })],
        rules,
      ),
    ).toEqual([]);
  });
});

describe('public entry points only', () => {
  it('accepts a package exposing src/index.ts and root-only exports', () => {
    expect(checkPublicEntryPoints([pkg('@helix/core', 'core')])).toEqual([]);
  });

  it('rejects a missing public entry point', () => {
    const violations = checkPublicEntryPoints([
      pkg('@helix/core', 'core', { hasPublicIndex: false }),
    ]);
    expect(violations.map((v) => v.rule)).toContain('public-entry-points');
  });

  it('rejects deep export subpaths', () => {
    const violations = checkPublicEntryPoints([
      pkg('@helix/core', 'core', { exportsRootOnly: false }),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toMatch(/root entry point only/);
  });
});

describe('forbidden deep imports', () => {
  it('accepts imports through a package public entry point', () => {
    const events = pkg('@helix/events', 'events', {
      imports: [{ file: 'src/index.ts', specifier: '@helix/core' }],
    });
    expect(checkForbiddenDeepImports([events], rules)).toEqual([]);
  });

  it('rejects a cross-package deep import', () => {
    const events = pkg('@helix/events', 'events', {
      imports: [{ file: 'src/index.ts', specifier: '@helix/core/internal/clock' }],
    });
    const violations = checkForbiddenDeepImports([events], rules);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe('no-deep-imports');
  });
});

describe('domain isolation', () => {
  it('accepts a core that imports only relative modules', () => {
    const core = pkg('@helix/core', 'core', {
      imports: [{ file: 'src/index.ts', specifier: './entity.js' }],
    });
    expect(checkDomainIsolation([core], rules)).toEqual([]);
  });

  it('rejects a Node built-in import from core', () => {
    const core = pkg('@helix/core', 'core', {
      imports: [{ file: 'src/clock.ts', specifier: 'node:fs' }],
    });
    const violations = checkDomainIsolation([core], rules);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.detail).toMatch(/Node built-in/);
  });

  it('rejects a third-party infrastructure import from core', () => {
    const core = pkg('@helix/core', 'core', {
      imports: [{ file: 'src/store.ts', specifier: 'better-sqlite3' }],
    });
    const violations = checkDomainIsolation([core], rules);
    expect(violations[0]?.detail).toMatch(/infrastructure dependency/);
  });

  it('ignores infrastructure imports in non-core packages', () => {
    const events = pkg('@helix/events', 'events', {
      imports: [{ file: 'src/store.ts', specifier: 'node:fs' }],
    });
    expect(checkDomainIsolation([events], rules)).toEqual([]);
  });
});

describe('acyclic dependency graph', () => {
  it('accepts an allowed acyclic edge', () => {
    const events = pkg('@helix/events', 'events', {
      imports: [{ file: 'src/index.ts', specifier: '@helix/core' }],
    });
    const core = pkg('@helix/core', 'core');
    expect(checkAcyclicDependencyGraph([core, events], rules)).toEqual([]);
  });

  it('rejects a disallowed dependency edge', () => {
    const core = pkg('@helix/core', 'core', {
      imports: [{ file: 'src/index.ts', specifier: '@helix/events' }],
    });
    const events = pkg('@helix/events', 'events');
    const violations = checkAcyclicDependencyGraph([core, events], rules);
    expect(violations.map((v) => v.rule)).toContain('disallowed-dependency');
  });

  it('detects a dependency cycle', () => {
    const cyclicRules: DependencyRules = {
      packages: { a: ['@helix/b'], b: ['@helix/a'] },
      rules: rules.rules,
    };
    const a = pkg('@helix/a', 'a', {
      imports: [{ file: 'src/index.ts', specifier: '@helix/b' }],
    });
    const b = pkg('@helix/b', 'b', {
      imports: [{ file: 'src/index.ts', specifier: '@helix/a' }],
    });
    const violations = checkAcyclicDependencyGraph([a, b], cyclicRules);
    expect(violations.map((v) => v.rule)).toContain('dependency-cycle');
  });
});

describe('runAllChecks', () => {
  it('returns no violations for a compliant workspace', () => {
    const core = pkg('@helix/core', 'core');
    const events = pkg('@helix/events', 'events', {
      imports: [{ file: 'src/index.ts', specifier: '@helix/core' }],
    });
    expect(runAllChecks([core, events], rules)).toEqual([]);
  });

  it('aggregates and deterministically sorts violations', () => {
    const broken = pkg('@helix/core', 'core', {
      hasPublicIndex: false,
      imports: [{ file: 'src/store.ts', specifier: 'node:fs' }],
    });
    const violations = runAllChecks([broken], rules);
    const rulesSeen = violations.map((v) => v.rule);
    expect(rulesSeen).toContain('domain-isolation');
    expect(rulesSeen).toContain('public-entry-points');
    const sorted = [...violations].sort(
      (a, b) => a.rule.localeCompare(b.rule) || a.detail.localeCompare(b.detail),
    );
    expect(violations).toEqual(sorted);
  });
});
