import { describe, expect, it } from 'vitest';
import { getConfidenceLevel, isPending, isVerified } from './types';

describe('Convex display type helpers', () => {
  it('maps confidence scores to display levels', () => {
    expect(getConfidenceLevel(0.8)).toBe('high');
    expect(getConfidenceLevel(0.6)).toBe('medium');
    expect(getConfidenceLevel(0.59)).toBe('low');
  });

  it('narrows court verification statuses', () => {
    expect(isVerified('verified')).toBe(true);
    expect(isVerified('pending')).toBe(false);
    expect(isPending('pending')).toBe(true);
    expect(isPending(undefined)).toBe(false);
  });
});
