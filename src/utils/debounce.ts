/**
 * @author Koushik R.
 *
 * Returns a debounced version of `fn` that waits `waitMs` ms after the last
 * call before firing. Exposes `.cancel()` to clear any pending invocation —
 * call it in disconnectedCallback to avoid callbacks firing after removal.
 *
 *   const search = debounce((term: string) => fetch(term), 300);
 *   search('hello');   // fires after 300ms of inactivity
 *   search.cancel();   // clear pending call
 */

export interface DebouncedFn<T extends unknown[]> {
  (...args: T): void;
  cancel(): void;
}

export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  waitMs: number,
): DebouncedFn<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: T): void => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = undefined;
      fn(...args);
    }, waitMs);
  };

  debounced.cancel = (): void => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  return debounced;
}
