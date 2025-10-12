import { useCallback } from 'react';

/**
 * Filters out non-numeric characters from a string
 * @param value - The input value to filter
 * @returns String containing only digits
 */
export function filterNumericOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * React hook that creates handlers for numeric-only input fields.
 * Prevents non-numeric characters from being typed or pasted.
 *
 * @param onChange - Optional callback that receives the numeric value
 * @returns Object with onChange and onKeyPress handlers
 *
 * @example
 * // Simple usage
 * const numericHandlers = useNumericInput();
 * <TextInput {...numericHandlers} />
 *
 * @example
 * // With callback
 * const numericHandlers = useNumericInput((value) => {
 *   console.log('Numeric value:', value);
 * });
 * <TextInput {...numericHandlers} />
 *
 * @example
 * // With react-hook-form
 * const numericHandlers = useNumericInput();
 * <TextInput {...register('phoneNumber')} {...numericHandlers} />
 */
export function useNumericInput(onChange?: (value: string) => void) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow digits
      const numericValue = filterNumericOnly(e.target.value);
      e.target.value = numericValue;

      // Call the provided onChange callback if it exists
      if (onChange) {
        onChange(numericValue);
      }
    },
    [onChange]
  );

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent non-digit characters from being typed
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  }, []);

  return {
    onChange: handleChange,
    onKeyPress: handleKeyPress,
  };
}

/**
 * React hook that creates handlers for numeric-only input with optional max length.
 * Prevents non-numeric characters and enforces maximum length.
 *
 * @param maxLength - Maximum number of digits allowed
 * @param onChange - Optional callback that receives the numeric value
 * @returns Object with onChange and onKeyPress handlers
 *
 * @example
 * // Limit to 10 digits (e.g., phone number)
 * const phoneHandlers = useNumericInputWithMaxLength(10);
 * <TextInput {...phoneHandlers} />
 *
 * @example
 * // With callback
 * const upcHandlers = useNumericInputWithMaxLength(12, (value) => {
 *   if (value.length === 12) {
 *     validateUPC(value);
 *   }
 * });
 * <TextInput {...upcHandlers} />
 */
export function useNumericInputWithMaxLength(
  maxLength: number,
  onChange?: (value: string) => void
) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow digits and enforce max length
      let numericValue = filterNumericOnly(e.target.value);

      if (numericValue.length > maxLength) {
        numericValue = numericValue.slice(0, maxLength);
      }

      e.target.value = numericValue;

      // Call the provided onChange callback if it exists
      if (onChange) {
        onChange(numericValue);
      }
    },
    [maxLength, onChange]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      const currentLength = filterNumericOnly(target.value).length;

      // Prevent non-digit characters
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
        return;
      }

      // Prevent typing if max length reached
      if (currentLength >= maxLength) {
        e.preventDefault();
      }
    },
    [maxLength]
  );

  return {
    onChange: handleChange,
    onKeyPress: handleKeyPress,
  };
}
