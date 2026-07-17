import { describe, expect, it } from 'vitest';
import { AtlasBootstrap, isCorePath, type BootstrapInput, type FileSink } from './bootstrap.js';

function recordingSink(
  existing: readonly string[] = [],
): FileSink & { written: Map<string, string> } {
  const present = new Set(existing.map((p) => p.replace(/\\/g, '/')));
  const written = new Map<string, string>();
  return {
    written,
    exists: (path) => present.has(path.replace(/\\/g, '/')),
    write: (path, content) => written.set(path.replace(/\\/g, '/'), content),
  };
}

function input(overrides: Partial<BootstrapInput> = {}): BootstrapInput {
  return {
    projectName: overrides.projectName ?? 'conflict-atlas',
    knowledge: overrides.knowledge ?? [{ id: 'k-1', title: 'Domain glossary', body: '...' }],
    capabilities: overrides.capabilities ?? ['conflict-registry'],
    firstChangeId: overrides.firstChangeId ?? '0001-bootstrap',
    firstChangeTitle: overrides.firstChangeTitle ?? 'Bootstrap the atlas',
  };
}

describe('isCorePath', () => {
  it('flags Helix core namespaces', () => {
    expect(isCorePath('packages/core/src/x.ts')).toBe(true);
    expect(isCorePath('node_modules/@helix/core/index.js')).toBe(true);
  });
  it('allows product paths', () => {
    expect(isCorePath('conflict-atlas/src/domain/conflict-atlas.ts')).toBe(false);
  });
});

describe('AtlasBootstrap', () => {
  it('initializes the project, imports knowledge, generates OpenSpec, and stages the first change', () => {
    const fs = recordingSink();
    const result = new AtlasBootstrap(fs).bootstrap(input());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.project.name).toBe('conflict-atlas');
      expect(result.value.project.created).toContain('conflict-atlas/helix.config.json');
      expect(result.value.importedKnowledge).toEqual([
        { id: 'k-1', title: 'Domain glossary', body: '...', source: 'retained' },
      ]);
      expect(result.value.openspec).toContain('conflict-atlas/openspec/project.md');
      expect(result.value.openspec).toContain(
        'conflict-atlas/openspec/specs/conflict-registry/spec.md',
      );
      expect(result.value.firstChange).toEqual({
        id: '0001-bootstrap',
        title: 'Bootstrap the atlas',
        status: 'proposed',
      });
    }
    // The generated product domain lives under the product project, not core.
    expect([...fs.written.keys()]).toContain('conflict-atlas/src/domain/conflict-atlas.ts');
  });

  it('is non-destructive: fails and writes nothing when a target exists', () => {
    const fs = recordingSink(['conflict-atlas/README.md']);
    const result = new AtlasBootstrap(fs).bootstrap(input());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FILE_EXISTS');
    }
    expect(fs.written.size).toBe(0);
  });

  it('refuses to place a product artifact inside Helix core', () => {
    const fs = recordingSink();
    // A project name that resolves into a core namespace must be rejected.
    const result = new AtlasBootstrap(fs).bootstrap(input({ projectName: 'packages/core' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DOMAIN_LEAK');
    }
    expect(fs.written.size).toBe(0);
  });

  it('rejects invalid input', () => {
    const fs = recordingSink();
    expect(new AtlasBootstrap(fs).bootstrap(input({ projectName: '  ' })).ok).toBe(false);
    expect(new AtlasBootstrap(fs).bootstrap(input({ capabilities: [] })).ok).toBe(false);
  });

  it('rejects duplicate knowledge ids', () => {
    const fs = recordingSink();
    const result = new AtlasBootstrap(fs).bootstrap(
      input({
        knowledge: [
          { id: 'dup', title: 'a', body: '' },
          { id: 'dup', title: 'b', body: '' },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('BOOTSTRAP_VALIDATION');
    }
  });
});
