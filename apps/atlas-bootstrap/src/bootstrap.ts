import { type Result, err, ok } from '@helix/core';
import {
  BootstrapValidationError,
  DomainLeakError,
  FileExistsError,
  type BootstrapError,
} from './errors.js';

/** A write-only, existence-aware file sink (keeps bootstrap testable and non-destructive). */
export interface FileSink {
  exists(path: string): boolean;
  write(path: string, content: string): void;
}

/** A retained product-knowledge item to import into the new project. */
export interface KnowledgeItemInput {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

/** An imported knowledge item. */
export interface KnowledgeItem extends KnowledgeItemInput {
  readonly source: 'retained';
}

/** A governed change created during bootstrap. */
export interface GovernedChange {
  readonly id: string;
  readonly title: string;
  readonly status: 'proposed';
}

/** The inputs to a bootstrap run. */
export interface BootstrapInput {
  readonly projectName: string;
  readonly knowledge: readonly KnowledgeItemInput[];
  readonly capabilities: readonly string[];
  readonly firstChangeId: string;
  readonly firstChangeTitle: string;
}

/** The result of a successful bootstrap. */
export interface BootstrapResult {
  readonly project: { readonly name: string; readonly created: readonly string[] };
  readonly importedKnowledge: readonly KnowledgeItem[];
  readonly openspec: readonly string[];
  readonly firstChange: GovernedChange;
}

/** Join path segments with POSIX separators, deterministically. */
function joinPath(...segments: readonly string[]): string {
  return segments.join('/').replace(/\/+/g, '/').replace(/\/$/, '');
}

/** Whether a path would place a product artifact inside a Helix core namespace. */
export function isCorePath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  return normalized.includes('packages/core') || normalized.includes('@helix/core');
}

/**
 * Bootstraps a product project (the Conflict Impact Atlas) *with* Helix:
 * initializes the project, imports retained product knowledge, generates a
 * project-local OpenSpec, and stages the first governed change — writing every
 * artifact non-destructively and refusing to place any product artifact inside
 * a Helix core namespace (dogfood: keep product domain outside Helix core).
 */
export class AtlasBootstrap {
  readonly #fs: FileSink;

  constructor(fs: FileSink) {
    this.#fs = fs;
  }

  bootstrap(input: BootstrapInput): Result<BootstrapResult, BootstrapError> {
    const issues = this.#validate(input);
    if (issues.length > 0) {
      return err(new BootstrapValidationError(issues));
    }

    const importedKnowledge = this.#importKnowledge(input.knowledge);
    if (!importedKnowledge.ok) {
      return err(importedKnowledge.error);
    }

    const files: { path: string; content: string }[] = [];
    const projectFiles = this.#projectFiles(input);
    const openspecFiles = this.#openspecFiles(input);
    files.push(...projectFiles, ...openspecFiles);

    // Enforce the product-domain-outside-core boundary and non-destructive writes.
    for (const file of files) {
      if (isCorePath(file.path)) {
        return err(new DomainLeakError(file.path));
      }
      if (this.#fs.exists(file.path)) {
        return err(new FileExistsError(file.path));
      }
    }
    for (const file of files) {
      this.#fs.write(file.path, file.content);
    }

    return ok({
      project: { name: input.projectName, created: projectFiles.map((f) => f.path) },
      importedKnowledge: importedKnowledge.value,
      openspec: openspecFiles.map((f) => f.path),
      firstChange: { id: input.firstChangeId, title: input.firstChangeTitle, status: 'proposed' },
    });
  }

  #validate(input: BootstrapInput): string[] {
    const issues: string[] = [];
    if (input.projectName.trim() === '') {
      issues.push('projectName must not be empty');
    }
    if (input.capabilities.length === 0) {
      issues.push('at least one capability is required');
    }
    if (input.firstChangeId.trim() === '') {
      issues.push('firstChangeId must not be empty');
    }
    if (input.firstChangeTitle.trim() === '') {
      issues.push('firstChangeTitle must not be empty');
    }
    return issues;
  }

  #importKnowledge(
    items: readonly KnowledgeItemInput[],
  ): Result<readonly KnowledgeItem[], BootstrapValidationError> {
    const issues: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (item.id.trim() === '') {
        issues.push('a knowledge item has an empty id');
        continue;
      }
      if (seen.has(item.id)) {
        issues.push(`duplicate knowledge id "${item.id}"`);
      }
      seen.add(item.id);
      if (item.title.trim() === '') {
        issues.push(`knowledge item "${item.id}" has an empty title`);
      }
    }
    if (issues.length > 0) {
      return err(new BootstrapValidationError(issues));
    }
    const imported = items
      .map((item): KnowledgeItem => ({ ...item, source: 'retained' }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return ok(imported);
  }

  #projectFiles(input: BootstrapInput): { path: string; content: string }[] {
    const root = input.projectName;
    const manifest = { name: input.projectName, governedBy: 'helix' };
    return [
      {
        path: joinPath(root, 'README.md'),
        content: `# ${input.projectName}\n\nGoverned by Helix.\n`,
      },
      {
        path: joinPath(root, 'helix.config.json'),
        content: `${JSON.stringify(manifest, null, 2)}\n`,
      },
      {
        path: joinPath(root, 'src', 'domain', 'conflict-atlas.ts'),
        content: '// Conflict Impact Atlas product domain (outside Helix core).\nexport {};\n',
      },
    ];
  }

  #openspecFiles(input: BootstrapInput): { path: string; content: string }[] {
    const root = joinPath(input.projectName, 'openspec');
    const files: { path: string; content: string }[] = [
      {
        path: joinPath(root, 'project.md'),
        content: `# ${input.projectName}\n\nProject-local OpenSpec.\n`,
      },
    ];
    for (const capability of [...input.capabilities].sort((a, b) => a.localeCompare(b))) {
      files.push({
        path: joinPath(root, 'specs', capability, 'spec.md'),
        content: `# ${capability}\n\n## Requirements\n`,
      });
    }
    const changeRoot = joinPath(root, 'changes', input.firstChangeId);
    files.push(
      { path: joinPath(changeRoot, 'proposal.md'), content: `# ${input.firstChangeTitle}\n` },
      {
        path: joinPath(changeRoot, 'tasks.md'),
        content: '- [ ] Implement the first governed change.\n',
      },
      {
        path: joinPath(changeRoot, 'change.yaml'),
        content: `id: ${input.firstChangeId}\nstatus: proposed\n`,
      },
    );
    return files;
  }
}
