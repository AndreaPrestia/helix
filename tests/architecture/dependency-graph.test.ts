import { describe, expect, it } from 'vitest';
import { readJson, readYaml } from '../support/repo.js';

interface PackageDependencyRules {
  readonly packages: Record<string, readonly string[]>;
  readonly rules: {
    readonly noCycles: boolean;
    readonly coreInfrastructureImports: readonly string[];
  };
}

interface AllowedDependencyModule {
  readonly mayImport?: readonly string[];
}

interface AllowedDependencies {
  readonly modules: Record<string, AllowedDependencyModule>;
}

/**
 * Detects whether a directed graph (adjacency list) contains a cycle.
 * Deterministic: nodes and edges are visited in declaration order.
 */
function findCycle(graph: Map<string, readonly string[]>): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function walk(node: string): string[] | null {
    if (visited.has(node)) {
      return null;
    }
    if (visiting.has(node)) {
      return [...stack, node];
    }
    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (!graph.has(next)) {
        continue;
      }
      const cycle = walk(next);
      if (cycle) {
        return cycle;
      }
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const node of graph.keys()) {
    const cycle = walk(node);
    if (cycle) {
      return cycle;
    }
  }
  return null;
}

describe('architecture test command — package dependency ruleset', () => {
  const rules = readJson<PackageDependencyRules>(
    'reference/architecture/package-dependency-rules.json',
  );

  const nameToKey = new Map<string, string>(
    Object.keys(rules.packages).map((key) => [`@helix/${key}`, key]),
  );

  const graph = new Map<string, readonly string[]>(
    Object.entries(rules.packages).map(([pkg, deps]) => [
      pkg,
      deps.map((dep) => nameToKey.get(dep) ?? dep),
    ]),
  );

  it('declares an acyclic package dependency graph', () => {
    expect(rules.rules.noCycles).toBe(true);
    expect(findCycle(graph)).toBeNull();
  });

  it('keeps @helix/core free of infrastructure and package dependencies', () => {
    expect(rules.packages['core']).toEqual([]);
    expect(rules.rules.coreInfrastructureImports).toEqual([]);
  });

  it('references only declared packages in every dependency edge', () => {
    for (const [pkg, deps] of graph) {
      for (const dep of deps) {
        expect(graph.has(dep), `${pkg} depends on unknown package ${dep}`).toBe(true);
      }
    }
  });
});

describe('architecture test command — allowed module dependencies', () => {
  const allowed = readYaml<AllowedDependencies>('reference/architecture/allowed-dependencies.yaml');

  const graph = new Map<string, readonly string[]>(
    Object.entries(allowed.modules).map(([module, spec]) => [module, spec.mayImport ?? []]),
  );

  it('declares an acyclic module dependency graph', () => {
    expect(findCycle(graph)).toBeNull();
  });
});
