import { describe, expect, it } from 'vitest';
import { ImpactAtlas, type Conflict } from './conflict-atlas.js';

function conflict(overrides: Partial<Conflict> = {}): Conflict {
  return {
    id: overrides.id ?? 'c-1',
    title: overrides.title ?? 'a conflict',
    severity: overrides.severity ?? 'medium',
    impacts: overrides.impacts ?? ['area-a'],
  };
}

describe('ImpactAtlas (product domain)', () => {
  it('lists conflicts id-sorted', () => {
    const atlas = new ImpactAtlas();
    atlas.add(conflict({ id: 'c-2' }));
    atlas.add(conflict({ id: 'c-1' }));
    expect(atlas.conflicts().map((c) => c.id)).toEqual(['c-1', 'c-2']);
  });

  it('returns conflicts impacting an area ordered by descending severity', () => {
    const atlas = new ImpactAtlas();
    atlas.add(conflict({ id: 'c-1', severity: 'low', impacts: ['x'] }));
    atlas.add(conflict({ id: 'c-2', severity: 'critical', impacts: ['x'] }));
    atlas.add(conflict({ id: 'c-3', severity: 'high', impacts: ['y'] }));
    expect(atlas.impacting('x').map((c) => c.id)).toEqual(['c-2', 'c-1']);
  });

  it('replaces a conflict on re-add by id', () => {
    const atlas = new ImpactAtlas();
    atlas.add(conflict({ id: 'c-1', severity: 'low' }));
    atlas.add(conflict({ id: 'c-1', severity: 'critical' }));
    expect(atlas.conflicts()).toHaveLength(1);
    expect(atlas.conflicts()[0]?.severity).toBe('critical');
  });
});
