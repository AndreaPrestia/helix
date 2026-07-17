import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ImportRef, PackageModel } from './model.js';

const GROUPS = ['apps', 'packages', 'plugins'] as const;
type Group = (typeof GROUPS)[number];

interface PackageJson {
  readonly name?: string;
  readonly exports?: unknown;
}

const IMPORT_PATTERNS: readonly RegExp[] = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function listDirectories(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }
  return readdirSync(path)
    .map((entry) => join(path, entry))
    .filter((entry) => statSync(entry).isDirectory());
}

function collectTsFiles(dir: string, acc: string[]): void {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectTsFiles(full, acc);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
}

function extractImports(source: string): string[] {
  const specifiers = new Set<string>();
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) {
        specifiers.add(specifier);
      }
    }
  }
  return [...specifiers];
}

function exportsRootOnly(exportsField: unknown): boolean {
  if (typeof exportsField === 'string') {
    return true;
  }
  if (exportsField !== null && typeof exportsField === 'object') {
    return Object.keys(exportsField).every((key) => key === '.');
  }
  return false;
}

function loadPackage(dir: string, group: Group): PackageModel | null {
  const manifestPath = join(dir, 'package.json');
  if (!existsSync(manifestPath)) {
    return null;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageJson;
  if (manifest.name === undefined) {
    return null;
  }

  const srcDir = join(dir, 'src');
  const tsFiles: string[] = [];
  collectTsFiles(srcDir, tsFiles);

  const imports: ImportRef[] = [];
  for (const file of tsFiles) {
    const source = readFileSync(file, 'utf8');
    const relativeFile = relative(dir, file).split('\\').join('/');
    for (const specifier of extractImports(source)) {
      imports.push({ file: relativeFile, specifier });
    }
  }

  const key = manifest.name.startsWith('@helix/')
    ? manifest.name.slice('@helix/'.length)
    : manifest.name;

  return {
    name: manifest.name,
    key,
    group,
    hasPublicIndex: existsSync(join(srcDir, 'index.ts')),
    exportsRootOnly: exportsRootOnly(manifest.exports),
    imports,
  };
}

/** Discover every workspace package on disk and build its architecture model. */
export function loadWorkspacePackages(repoRoot: string): PackageModel[] {
  const packages: PackageModel[] = [];
  for (const group of GROUPS) {
    for (const dir of listDirectories(join(repoRoot, group))) {
      const model = loadPackage(dir, group);
      if (model) {
        packages.push(model);
      }
    }
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name));
}
