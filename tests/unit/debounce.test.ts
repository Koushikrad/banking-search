/**
 * debounce.test.ts
 * @author Koushik R.
 *
 * Unit tests for the debounce utility.
 * Runs in Vitest with jsdom — no browser or Lit dependency needed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../../src/utils/debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires the callback after the wait period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('hello');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('hello');
  });

  it('resets the timer on every new call — only the last fires', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('a');
    vi.advanceTimersByTime(100);
    debounced('b');
    vi.advanceTimersByTime(100);
    debounced('c');
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('does not fire before the wait period elapses', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('test');
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('cancel() prevents the pending callback from firing', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('hello');
    debounced.cancel();
    vi.advanceTimersByTime(300);

    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel() is safe to call when no pending timer exists', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    expect(() => debounced.cancel()).not.toThrow();
  });

  it('passes multiple arguments correctly', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('term', 'accounts', 'req-123');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('term', 'accounts', 'req-123');
  });

  it('can be called again after a previous invocation completed', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('first');
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);

    debounced('second');
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('second');
  });
});
