/**
 * Deterministic, stable node identifiers. The same repository artifact always
 * maps to the same id across rebuilds, which is what makes incremental updates
 * and traceability reliable.
 */

/** Stable id for a package node, e.g. `package:@helix/core`. */
export function packageNodeId(name: string): string {
  return `package:${name}`;
}

/** Stable id for a file node, e.g. `file:packages/core/src/index.ts`. */
export function fileNodeId(path: string): string {
  return `file:${path}`;
}

/** Stable id for a symbol node, e.g. `symbol:packages/core/src/result.ts#ok`. */
export function symbolNodeId(path: string, symbol: string): string {
  return `symbol:${path}#${symbol}`;
}

/** Stable id for a test node, e.g. `test:packages/core/src/result.test.ts`. */
export function testNodeId(path: string): string {
  return `test:${path}`;
}
