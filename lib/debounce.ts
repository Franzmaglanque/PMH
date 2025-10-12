import { debounce as lodashDebounce } from 'lodash';
import { useCallback, useMemo } from 'react';

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last invocation.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay (default: 800ms)
 * @returns A debounced version of the function
 *
 * @example
 * const debouncedSearch = createDebounce((value: string) => {
 *   console.log('Searching for:', value);
 * }, 500);
 *
 * // Call it multiple times
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc'); // Only this will execute after 500ms
 */
export function createDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 800
): ReturnType<typeof lodashDebounce<T>> {
  return lodashDebounce(func, wait);
}

/**
 * React hook that creates a debounced callback function.
 * The debounced function will only execute after the specified delay
 * when the user stops invoking it.
 *
 * @param callback - The callback function to debounce
 * @param delay - The number of milliseconds to delay (default: 800ms)
 * @returns A debounced version of the callback
 *
 * @example
 * // In your component:
 * const handleSearch = useDebouncedCallback((value: string) => {
 *   // This will only execute after user stops typing for 800ms
 *   console.log('Searching for:', value);
 * }, 800);
 *
 * // In your JSX:
 * <TextInput onChange={(e) => handleSearch(e.target.value)} />
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 800
) {
  const debouncedFn = useMemo(
    () => lodashDebounce(callback, delay),
    [callback, delay]
  );

  return debouncedFn;
}

/**
 * React hook that creates a debounced onChange handler for input fields.
 * Automatically handles the event and extracts the value.
 *
 * @param onValueChange - Callback that receives the input value
 * @param delay - The number of milliseconds to delay (default: 800ms)
 * @returns An onChange handler for your input
 *
 * @example
 * // In your component:
 * const handleSearch = (value: string) => {
 *   console.log('Searching for:', value);
 * };
 *
 * const debouncedOnChange = useDebouncedInput(handleSearch, 800);
 *
 * // In your JSX:
 * <TextInput onChange={debouncedOnChange} />
 */
export function useDebouncedInput(
  onValueChange: (value: string) => void,
  delay: number = 800
) {
  const debouncedCallback = useDebouncedCallback(onValueChange, delay);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      debouncedCallback(value);
    },
    [debouncedCallback]
  );

  return handleChange;
}
