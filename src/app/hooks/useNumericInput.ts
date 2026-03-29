import { useState, useCallback, ChangeEvent } from 'react';

/**
 * Custom hook for numeric inputs that properly handles empty states
 * 
 * This hook stores the value as a string internally to allow for empty input,
 * and only converts to number when needed for calculations or database saves.
 * 
 * @param initialValue - Initial numeric value (default: 0)
 * @returns Object with value, displayValue, onChange handler, and getValueAsNumber
 */
export function useNumericInput(initialValue: number = 0) {
  const [stringValue, setStringValue] = useState<string>(initialValue.toString());

  /**
   * Handle input change - stores as string to allow empty state
   */
  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string for clearing
    if (value === '' || value === null || value === undefined) {
      setStringValue('');
      return;
    }
    
    // Allow only valid numeric input (including decimals and negative)
    if (/^-?\d*\.?\d*$/.test(value)) {
      setStringValue(value);
    }
  }, []);

  /**
   * Get the current value as a number (for calculations)
   * Returns NaN if empty, 0 if empty and shouldDefaultToZero is true
   */
  const getValueAsNumber = useCallback((shouldDefaultToZero: boolean = false): number => {
    if (stringValue === '' || stringValue === null || stringValue === undefined) {
      return shouldDefaultToZero ? 0 : NaN;
    }
    const num = parseFloat(stringValue);
    return isNaN(num) ? (shouldDefaultToZero ? 0 : NaN) : num;
  }, [stringValue]);

  /**
   * Set value programmatically (accepts number or string)
   */
  const setValue = useCallback((value: number | string) => {
    if (typeof value === 'number') {
      setStringValue(isNaN(value) ? '' : value.toString());
    } else {
      setStringValue(value);
    }
  }, []);

  /**
   * Reset to initial value
   */
  const reset = useCallback(() => {
    setStringValue(initialValue.toString());
  }, [initialValue]);

  return {
    value: stringValue,           // String value for input
    displayValue: stringValue || '', // Guaranteed string for display
    onChange,                      // onChange handler for input
    getValueAsNumber,             // Function to get numeric value
    setValue,                      // Function to set value programmatically
    reset,                        // Function to reset to initial value
    isEmpty: stringValue === ''   // Check if input is empty
  };
}