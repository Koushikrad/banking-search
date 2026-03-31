/**
 * debounce.ts
 * @author Koushik R.
 *
 * Generic typed debounce utility.
 *
 * Returns a debounced version of the given function that delays invoking
 * it until `waitMs` milliseconds have passed since the last call.
 * Each new call resets the timer — only the final call in a rapid sequence
 * executes.
 *
 * The returned function exposes a `.cancel()` method to clear any pending
 * invocation. Always call cancel() in disconnectedCallback to prevent
 * the callback firing after the element has been removed from the DOM.
 *
 * Usage:
 *   const debouncedSearch = debounce((term: string) => search(term), 300);
 *   debouncedSearch('hello');  // fires after 300ms of inactivity
 *   debouncedSearch.cancel();  // clear pending call
 */

export interface DebouncedFn<T extends unknown[]> {
  (...args: T): void;
  cancel(): void;
}

/**
 * Creates a debounced version of `fn` that fires after `waitMs` of inactivity.
 *
 * @param fn     - The function to debounce. Called with the arguments from
 *                 the most recent invocation.
 * @param waitMs - Milliseconds to wait after the last call before invoking fn.
 * @returns        Debounced function with a `.cancel()` method.
 */
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
