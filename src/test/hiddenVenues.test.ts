import { describe, it, expect } from 'vitest';
import { VENUES } from '@/config/api';

/**
 * Hidden venues stay in the config and stay fetched — the entry carries the
 * name, timezone and pricing a cached report still needs, and the fetch keeps
 * their history current so unhiding gives current data rather than a frozen
 * cache. They are simply never listed in the venue grid.
 */
describe('hidden venues', () => {
  const HIDDEN = ['41167', 'aerth', '40726', 'projectmood'];

  it.each(HIDDEN)('%s is still configured', id => {
    expect(VENUES.find(v => v.id === id)).toBeDefined();
  });

  it.each(HIDDEN)('%s is marked hidden', id => {
    expect(VENUES.find(v => v.id === id)!.hidden).toBe(true);
  });

  it('hides exactly those four and nothing else', () => {
    expect(VENUES.filter(v => v.hidden).map(v => v.id).sort()).toEqual([...HIDDEN].sort());
  });

  it('leaves every other venue listed', () => {
    const listed = VENUES.filter(v => !v.hidden).map(v => v.id);
    expect(listed).toContain('59636');
    expect(listed).toContain('innerstudio');
    expect(listed).not.toContain('41167');
  });
});
