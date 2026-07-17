import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Option, fromNullable, none } from '@helix/core';
import type { OpenSpecFileStore } from './file-store.js';

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

/** A filesystem-backed {@link OpenSpecFileStore} rooted at an OpenSpec directory. */
export class FileSystemFileStore implements OpenSpecFileStore {
  readonly #root: string;

  constructor(root: string) {
    this.#root = root;
  }

  async read(path: string): Promise<Option<string>> {
    try {
      return fromNullable(await readFile(this.#resolve(path), 'utf8'));
    } catch (error) {
      if (hasCode(error, 'ENOENT') || hasCode(error, 'EISDIR')) {
        return none();
      }
      throw error;
    }
  }

  async list(path: string): Promise<readonly string[]> {
    try {
      const entries = await readdir(this.#resolve(path));
      return [...entries].sort();
    } catch (error) {
      if (hasCode(error, 'ENOENT') || hasCode(error, 'ENOTDIR')) {
        return [];
      }
      throw error;
    }
  }

  #resolve(path: string): string {
    const segments = path.split('/').filter((segment) => segment !== '');
    return join(this.#root, ...segments);
  }
}
