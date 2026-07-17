import type { Option } from '@helix/core';

/**
 * A minimal read-only view of the OpenSpec workspace tree. Paths are POSIX-style
 * and relative to the OpenSpec root (the directory containing `specs/` and
 * `changes/`). Keeping the engine behind this port lets it be tested with an
 * in-memory tree and run against the real filesystem in production.
 */
export interface OpenSpecFileStore {
  /** Read a file's contents, or `none` when it does not exist. */
  read(path: string): Promise<Option<string>>;
  /** List immediate child entry names of a directory, or `[]` when missing. */
  list(path: string): Promise<readonly string[]>;
}
