import { describe, expect, it } from 'vitest';
import { parseArgs } from './args.js';

describe('parseArgs', () => {
  it('collects positional arguments', () => {
    expect(parseArgs(['a', 'b'])).toEqual({ args: ['a', 'b'], flags: {} });
  });

  it('parses boolean flags', () => {
    expect(parseArgs(['--verbose'])).toEqual({ args: [], flags: { verbose: true } });
  });

  it('parses key=value flags', () => {
    expect(parseArgs(['--out=dist'])).toEqual({ args: [], flags: { out: 'dist' } });
  });

  it('preserves an empty value in key=value', () => {
    expect(parseArgs(['--out='])).toEqual({ args: [], flags: { out: '' } });
  });

  it('ignores a bare double dash', () => {
    expect(parseArgs(['--'])).toEqual({ args: [], flags: {} });
  });

  it('mixes positionals and flags', () => {
    expect(parseArgs(['run', '--json', '--dir=/tmp', 'extra'])).toEqual({
      args: ['run', 'extra'],
      flags: { json: true, dir: '/tmp' },
    });
  });
});
