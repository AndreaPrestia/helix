import { type Option, fromNullable } from '@helix/core';
import type { OpenSpecFileStore } from './file-store.js';

/** An in-memory {@link OpenSpecFileStore} backed by a POSIX-path → content map. */
export class InMemoryFileStore implements OpenSpecFileStore {
  readonly #files: Map<string, string>;

  constructor(files: Readonly<Record<string, string>>) {
    this.#files = new Map(Object.entries(files));
  }

  async read(path: string): Promise<Option<string>> {
    return fromNullable(this.#files.get(normalize(path)));
  }

  async list(path: string): Promise<readonly string[]> {
    const prefix = normalize(path) === '' ? '' : `${normalize(path)}/`;
    const children = new Set<string>();
    for (const filePath of this.#files.keys()) {
      if (prefix !== '' && !filePath.startsWith(prefix)) {
        continue;
      }
      const rest = filePath.slice(prefix.length);
      if (rest === '') {
        continue;
      }
      const firstSegment = rest.split('/')[0];
      if (firstSegment !== undefined && firstSegment !== '') {
        children.add(firstSegment);
      }
    }
    return [...children].sort();
  }
}

function normalize(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}
