import { builtinModules } from 'node:module';
import type { DependencyRules, PackageModel, Violation } from './model.js';

const NODE_BUILTINS = new Set<string>([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

function isNodeBuiltin(specifier: string): boolean {
  return specifier.startsWith('node:') || NODE_BUILTINS.has(specifier);
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../') || specifier === '.';
}

interface HelixSpecifier {
  readonly key: string;
  readonly deep: boolean;
}

/** Parse a `@helix/<key>[/deep/path]` specifier, or `null` if not a Helix package. */
export function parseHelixSpecifier(specifier: string): HelixSpecifier | null {
  const prefix = '@helix/';
  if (!specifier.startsWith(prefix)) {
    return null;
  }
  const [key, ...rest] = specifier.slice(prefix.length).split('/');
  if (key === undefined || key.length === 0) {
    return null;
  }
  return { key, deep: rest.length > 0 };
}

function stripScope(name: string): string {
  return name.startsWith('@helix/') ? name.slice('@helix/'.length) : name;
}

/** Requirement: declared package responsibilities. */
export function checkDeclaredResponsibilities(
  packages: readonly PackageModel[],
  rules: DependencyRules,
): Violation[] {
  const violations: Violation[] = [];
  for (const pkg of packages) {
    // The dependency ruleset's `packages` map enumerates library packages only.
    // Apps are composition roots and plugins are extensions; both are governed by
    // separate rules and are exempt from this declaration requirement.
    if (pkg.group !== 'packages') {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(rules.packages, pkg.key)) {
      violations.push({
        rule: 'declared-responsibilities',
        package: pkg.name,
        detail: `package "${pkg.key}" is not declared in the dependency ruleset`,
      });
    }
  }
  return violations;
}

/** Requirement: public entry points only. */
export function checkPublicEntryPoints(packages: readonly PackageModel[]): Violation[] {
  const violations: Violation[] = [];
  for (const pkg of packages) {
    if (!pkg.hasPublicIndex) {
      violations.push({
        rule: 'public-entry-points',
        package: pkg.name,
        detail: 'missing public entry point src/index.ts',
      });
    }
    if (!pkg.exportsRootOnly) {
      violations.push({
        rule: 'public-entry-points',
        package: pkg.name,
        detail: 'package.json exports must expose the root entry point only',
      });
    }
  }
  return violations;
}

/** Requirement: forbidden deep imports. */
export function checkForbiddenDeepImports(
  packages: readonly PackageModel[],
  rules: DependencyRules,
): Violation[] {
  const violations: Violation[] = [];
  if (!rules.rules.noDeepImports) {
    return violations;
  }
  for (const pkg of packages) {
    for (const ref of pkg.imports) {
      const helix = parseHelixSpecifier(ref.specifier);
      if (helix && helix.deep && helix.key !== pkg.key) {
        violations.push({
          rule: 'no-deep-imports',
          package: pkg.name,
          detail: `deep import "${ref.specifier}" in ${ref.file}; use the package public entry point`,
        });
      }
    }
  }
  return violations;
}

/** Requirement: domain isolation (the core domain must not touch infrastructure). */
export function checkDomainIsolation(
  packages: readonly PackageModel[],
  rules: DependencyRules,
): Violation[] {
  const violations: Violation[] = [];
  const allowedInfra = new Set(rules.rules.coreInfrastructureImports);
  for (const pkg of packages) {
    if (pkg.key !== 'core') {
      continue;
    }
    for (const ref of pkg.imports) {
      if (isRelative(ref.specifier) || parseHelixSpecifier(ref.specifier)) {
        continue;
      }
      if (allowedInfra.has(ref.specifier)) {
        continue;
      }
      const kind = isNodeBuiltin(ref.specifier) ? 'Node built-in' : 'infrastructure dependency';
      violations.push({
        rule: 'domain-isolation',
        package: pkg.name,
        detail: `@helix/core imports ${kind} "${ref.specifier}" in ${ref.file}`,
      });
    }
  }
  return violations;
}

/** Requirement: acyclic dependency graph (plus allowed-edge enforcement). */
export function checkAcyclicDependencyGraph(
  packages: readonly PackageModel[],
  rules: DependencyRules,
): Violation[] {
  const violations: Violation[] = [];
  const present = new Map(packages.map((pkg) => [pkg.key, pkg]));
  const adjacency = new Map<string, Set<string>>();

  for (const pkg of packages) {
    const edges = new Set<string>();
    const allowed = new Set((rules.packages[pkg.key] ?? []).map(stripScope));
    for (const ref of pkg.imports) {
      const helix = parseHelixSpecifier(ref.specifier);
      if (!helix || helix.key === pkg.key) {
        continue;
      }
      edges.add(helix.key);
      if (rules.packages[pkg.key] !== undefined && !allowed.has(helix.key)) {
        violations.push({
          rule: 'disallowed-dependency',
          package: pkg.name,
          detail: `@helix/${pkg.key} may not depend on @helix/${helix.key}`,
        });
      }
    }
    adjacency.set(pkg.key, edges);
  }

  if (rules.rules.noCycles) {
    const cycle = findCycle(adjacency, present);
    if (cycle) {
      violations.push({
        rule: 'dependency-cycle',
        package: `@helix/${cycle[0]}`,
        detail: `dependency cycle: ${cycle.map((key) => `@helix/${key}`).join(' -> ')}`,
      });
    }
  }

  return violations;
}

function findCycle(
  adjacency: Map<string, Set<string>>,
  present: Map<string, PackageModel>,
): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function walk(node: string): string[] | null {
    if (visited.has(node)) {
      return null;
    }
    if (visiting.has(node)) {
      return [...stack.slice(stack.indexOf(node)), node];
    }
    visiting.add(node);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (!present.has(next)) {
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

  for (const node of adjacency.keys()) {
    const cycle = walk(node);
    if (cycle) {
      return cycle;
    }
  }
  return null;
}

const CHECKS = [
  checkDeclaredResponsibilities,
  checkForbiddenDeepImports,
  checkDomainIsolation,
  checkAcyclicDependencyGraph,
] as const;

/** Run every architecture rule and return all violations in a deterministic order. */
export function runAllChecks(
  packages: readonly PackageModel[],
  rules: DependencyRules,
): Violation[] {
  const violations: Violation[] = [
    ...checkPublicEntryPoints(packages),
    ...CHECKS.flatMap((check) => check(packages, rules)),
  ];
  return violations.sort(
    (a, b) =>
      a.rule.localeCompare(b.rule) ||
      a.package.localeCompare(b.package) ||
      a.detail.localeCompare(b.detail),
  );
}
