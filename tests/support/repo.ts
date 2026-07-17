import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repository root (the Helix workspace root). */
export const repoRoot = resolve(here, '..', '..');

/** Read a UTF-8 text file relative to the repository root. */
export function readText(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

/** Read and parse a JSON file relative to the repository root. */
export function readJson<T = unknown>(relativePath: string): T {
  return JSON.parse(readText(relativePath)) as T;
}

/** Read and parse a YAML file relative to the repository root. */
export function readYaml<T = unknown>(relativePath: string): T {
  return parseYaml(readText(relativePath)) as T;
}
