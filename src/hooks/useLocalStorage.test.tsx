import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useLocalStorage from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses the initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('filters', ['all']));

    expect(result.current[0]).toEqual(['all']);
  });

  it('reads an existing stored value', () => {
    window.localStorage.setItem('filters', JSON.stringify(['tennis']));

    const { result } = renderHook(() => useLocalStorage('filters', ['all']));

    expect(result.current[0]).toEqual(['tennis']);
  });

  it('updates React state and localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('count', 1));

    act(() => result.current[1]((current) => current + 1));

    expect(result.current[0]).toBe(2);
    expect(window.localStorage.getItem('count')).toBe('2');
  });

  it('falls back to the initial value when stored JSON is invalid', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.localStorage.setItem('broken', '{');

    const { result } = renderHook(() => useLocalStorage('broken', 'fallback'));

    expect(result.current[0]).toBe('fallback');
  });
});
