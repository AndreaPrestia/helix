import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { createInitCommand, validateManifest, type FileSink, type Template } from './init.js';
import { ExitCode, type CliIo, type CommandContext } from '../command.js';
import { none } from '@helix/core';

function recordingSink(
  existing: readonly string[] = [],
): FileSink & { readonly written: Map<string, string> } {
  const present = new Set(existing);
  const written = new Map<string, string>();
  return {
    written,
    exists: (path) => present.has(path),
    write: (path, content) => {
      written.set(path, content);
    },
  };
}

const io: CliIo = { writeOut: () => {}, writeErr: () => {} };

function context(flags: Record<string, string | boolean>): CommandContext {
  return { args: [], flags, config: none(), io };
}

const templates = new Map<string, Template>([
  ['minimal', { name: 'minimal', files: [{ path: 'README.md', content: '# hi\n' }] }],
]);

describe('validateManifest', () => {
  it('accepts a complete manifest', () => {
    expect(validateManifest({ name: 'proj', template: 'minimal' })).toEqual([]);
  });

  it('rejects an empty name', () => {
    expect(validateManifest({ name: '  ', template: 'minimal' })).toContain(
      'manifest "name" must not be empty',
    );
  });
});

describe('init command', () => {
  it('bootstraps template files plus a manifest', async () => {
    const fs = recordingSink();
    const result = await createInitCommand({ fs, templates, cwd: '/repo' }).run(
      context({ name: 'proj', dir: '/repo' }),
    );
    expect(result.exitCode).toBe(ExitCode.success);
    expect([...fs.written.keys()].sort()).toEqual(
      [join('/repo', 'README.md'), join('/repo', 'helix.config.json')].sort(),
    );
    expect(fs.written.get(join('/repo', 'helix.config.json'))).toContain('"name": "proj"');
  });

  it('is non-destructive: writes nothing when a target exists', async () => {
    const fs = recordingSink([join('/repo', 'README.md')]);
    const result = await createInitCommand({ fs, templates, cwd: '/repo' }).run(
      context({ name: 'proj', dir: '/repo' }),
    );
    expect(result.exitCode).toBe(ExitCode.error);
    expect(fs.written.size).toBe(0);
    expect(result.diagnostics?.[0]?.code).toBe('INIT_FILE_EXISTS');
  });

  it('rejects an unknown template', async () => {
    const fs = recordingSink();
    const result = await createInitCommand({ fs, templates, cwd: '/repo' }).run(
      context({ name: 'proj', template: 'nope' }),
    );
    expect(result.exitCode).toBe(ExitCode.usage);
    expect(result.diagnostics?.[0]?.code).toBe('INIT_UNKNOWN_TEMPLATE');
    expect(fs.written.size).toBe(0);
  });

  it('fails validation when the project name is missing', async () => {
    const fs = recordingSink();
    const result = await createInitCommand({ fs, templates, cwd: '/repo' }).run(context({}));
    expect(result.exitCode).toBe(ExitCode.usage);
    expect(result.diagnostics?.[0]?.code).toBe('INIT_INVALID_MANIFEST');
    expect(fs.written.size).toBe(0);
  });
});
