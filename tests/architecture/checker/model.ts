/**
 * In-memory model of the workspace used by the architecture rule checks.
 *
 * The model is deliberately decoupled from the filesystem so that the rule
 * functions in `rules.ts` are pure and deterministic: they operate on
 * `PackageModel[]` regardless of whether the data came from real packages on
 * disk (see `workspace.ts`) or from fixtures declared inline in tests.
 */

/** A single import specifier discovered inside a package's source file. */
export interface ImportRef {
  /** Package-relative source file the import was found in. */
  readonly file: string;
  /** The raw module specifier, e.g. `@helix/core` or `node:fs`. */
  readonly specifier: string;
}

/** A workspace package and everything the architecture rules need about it. */
export interface PackageModel {
  /** Public package name, e.g. `@helix/core`. */
  readonly name: string;
  /** Short key used by the dependency ruleset, e.g. `core`. */
  readonly key: string;
  /** Workspace group the package lives in. */
  readonly group: 'apps' | 'packages' | 'plugins';
  /** Whether `src/index.ts` exists as the single public entry point. */
  readonly hasPublicIndex: boolean;
  /** Whether `package.json` `exports` exposes the root entry point only. */
  readonly exportsRootOnly: boolean;
  /** Every import specifier found across the package source. */
  readonly imports: readonly ImportRef[];
}

/** Machine-readable dependency ruleset (`package-dependency-rules.json`). */
export interface DependencyRules {
  readonly packages: Record<string, readonly string[]>;
  readonly rules: {
    readonly noCycles: boolean;
    readonly noDeepImports: boolean;
    readonly coreInfrastructureImports: readonly string[];
    readonly pluginsMayDependOnPlugins: boolean;
  };
}

/** A single architecture-rule violation. */
export interface Violation {
  /** Stable identifier of the rule that was broken. */
  readonly rule: string;
  /** Package the violation was attributed to. */
  readonly package: string;
  /** Human-readable explanation of the specific breach. */
  readonly detail: string;
}
