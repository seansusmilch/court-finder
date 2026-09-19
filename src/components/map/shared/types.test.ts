import { describe, expect, it } from 'vitest';
import { combineClasses, filterSections, sortSections } from './types';

describe('map shared helpers', () => {
  it('combines class names and resolves conflicts', () => {
    expect(combineClasses('px-2', undefined, false, 'px-4')).toBe('px-4');
  });

  it('sorts sections by order while treating missing order as zero', () => {
    expect(
      sortSections([
        { id: 'late', order: 2 },
        { id: 'default' },
        { id: 'early', order: -1 },
      ]).map((item) => item.id)
    ).toEqual(['early', 'default', 'late']);
  });

  it('filters only sections explicitly hidden', () => {
    expect(
      filterSections([
        { id: 'visible' },
        { id: 'also-visible', show: true },
        { id: 'hidden', show: false },
      ]).map((item) => item.id)
    ).toEqual(['visible', 'also-visible']);
  });
});
