import { none, some, type Option } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { discoverConfig, type ConfigReader } from './config.js';

function readerFrom(files: Record<string, string>): ConfigReader {
  return {
    read(path: string): Option<string> {
      const normalized = path.split('\\').join('/');
      const content = files[normalized];
      return content === undefined ? none() : some(content);
    },
  };
}

describe('discoverConfig', () => {
  it('returns none when no config exists', () => {
    const result = discoverConfig(readerFrom({}), '/repo/apps/cli');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.some).toBe(false);
    }
  });

  it('finds a config in the start directory', () => {
    const reader = readerFrom({ '/repo/helix.config.json': '{"name":"helix"}' });
    const result = discoverConfig(reader, '/repo');
    expect(result.ok).toBe(true);
    if (result.ok && result.value.some) {
      expect(result.value.value.path.split('\\').join('/')).toBe('/repo/helix.config.json');
      expect(result.value.value.config).toEqual({ name: 'helix' });
    } else {
      expect.fail('expected a discovered config');
    }
  });

  it('walks up to a parent directory', () => {
    const reader = readerFrom({ '/repo/helix.config.json': '{"a":1}' });
    const result = discoverConfig(reader, '/repo/apps/cli/src');
    expect(result.ok).toBe(true);
    if (result.ok && result.value.some) {
      expect(result.value.value.config).toEqual({ a: 1 });
    } else {
      expect.fail('expected a discovered config');
    }
  });

  it('returns the nearest config when several exist', () => {
    const reader = readerFrom({
      '/repo/helix.config.json': '{"level":"root"}',
      '/repo/apps/helix.config.json': '{"level":"apps"}',
    });
    const result = discoverConfig(reader, '/repo/apps/cli');
    expect(result.ok).toBe(true);
    if (result.ok && result.value.some) {
      expect(result.value.value.config).toEqual({ level: 'apps' });
    } else {
      expect.fail('expected a discovered config');
    }
  });

  it('fails loudly on invalid JSON', () => {
    const reader = readerFrom({ '/repo/helix.config.json': '{ not json' });
    const result = discoverConfig(reader, '/repo');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG_ERROR');
    }
  });

  it('rejects a non-object config', () => {
    const reader = readerFrom({ '/repo/helix.config.json': '42' });
    const result = discoverConfig(reader, '/repo');
    expect(result.ok).toBe(false);
  });

  it('honours a custom filename', () => {
    const reader = readerFrom({ '/repo/.helixrc': '{"x":true}' });
    const result = discoverConfig(reader, '/repo', '.helixrc');
    expect(result.ok).toBe(true);
    if (result.ok && result.value.some) {
      expect(result.value.value.config).toEqual({ x: true });
    } else {
      expect.fail('expected a discovered config');
    }
  });
});
