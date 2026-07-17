import { type Option, type Result, err, none, ok, some } from '@helix/core';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { CliConfig } from './command.js';

/** The default configuration filename discovered by walking up the tree. */
export const DEFAULT_CONFIG_FILENAME = 'helix.config.json';

/** A discovered configuration file. */
export interface DiscoveredConfig {
  readonly path: string;
  readonly config: CliConfig;
}

/** Raised when a discovered configuration file cannot be parsed. */
export class ConfigError extends Error {
  readonly code = 'CONFIG_ERROR';
}

/**
 * A read-only probe for configuration files, abstracting the filesystem so
 * discovery is testable. Returns `none` when a path does not exist.
 */
export interface ConfigReader {
  read(path: string): Option<string>;
}

function parentDirectories(startDir: string): string[] {
  const directories: string[] = [];
  let current = startDir;
  for (;;) {
    directories.push(current);
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return directories;
}

/**
 * Discover configuration by walking up from `startDir`. Returns the nearest
 * config file, `none` if none is found, or a `ConfigError` if a found file
 * contains invalid JSON (never silently ignored — Constitution Article 7).
 */
export function discoverConfig(
  reader: ConfigReader,
  startDir: string,
  filename: string = DEFAULT_CONFIG_FILENAME,
): Result<Option<DiscoveredConfig>, ConfigError> {
  for (const directory of parentDirectories(startDir)) {
    const path = join(directory, filename);
    const content = reader.read(path);
    if (!content.some) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content.value);
    } catch {
      return err(new ConfigError(`invalid JSON in ${path}`));
    }
    if (typeof parsed !== 'object' || parsed === null) {
      return err(new ConfigError(`config in ${path} must be an object`));
    }
    return ok(some({ path, config: parsed as CliConfig }));
  }
  return ok(none());
}

/** A {@link ConfigReader} backed by the real filesystem. */
export const fileSystemConfigReader: ConfigReader = {
  read(path: string): Option<string> {
    try {
      return some(readFileSync(path, 'utf8'));
    } catch {
      return none();
    }
  },
};
