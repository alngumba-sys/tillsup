import { forwardRef, InputHTMLAttributes } from 'react';
import { Input } from './input';
import { useNumericInput } from '../../hooks/useNumericInput';

interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: number;
  onChange?: (value: number | null) => void;
  allowEmpty?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * A numeric input component that properly handles empty states
 * 
 * Features:
 * - Allows empty input (backspace to clear)
 * - Only validates on blur/submit, not during typing
 * - Returns null when empty (or 0 if allowEmpty is false)
 * - Prevents the "backspace to zero" bug
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value = 0, onChange, allowEmpty = true, min, max, step, ...props }, ref) => {
    const {
      displayValue,
      onChange: handleChange,
      getValueAsNumber,
      setValue
    } = useNumericInput(value);

    // Handle input change - just pass through, no validation during typing
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(e);
      // Don't call onChange yet - wait for blur or explicit submit
    };

    // Handle blur - validate and call onChange
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const numValue = getValueAsNumber(false);
      
      if (isNaN(numValue) || e.target.value === '') {
        if (allowEmpty) {
          onChange?.(null);
        } else {
          onChange?.(0);
          setValue(0);
        }
      } else {
        // Apply min/max constraints on blur
        let finalValue = numValue;
        if (min !== undefined && finalValue < min) finalValue = min;
        if (max !== undefined && finalValue > max) finalValue = max;
        
        onChange?.(finalValue);
        if (finalValue !== numValue) {
          setValue(finalValue);
        }
      }
      
      props.onBlur?.(e);
    };

    // Handle key down for Enter key
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const numValue = getValueAsNumber(false);
        
        if (isNaN(numValue) || displayValue === '') {
          if (allowEmpty) {
            onChange?.(null);
          } else {
            onChange?.(0);
            setValue(0);
          }
        } else {
          let finalValue = numValue;
          if (min !== undefined && finalValue < min) finalValue = min;
          if (max !== undefined && finalValue > max) finalValue = max;
          
          onChange?.(finalValue);
          if (finalValue !== numValue) {
            setValue(finalValue);
          }
        }
      }
      
      props.onKeyDown?.(e);
    };

    // Sync external value changes
    if (value !== getValueAsNumber(false) && value !== undefined) {
      setValue(value);
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        step={step}
      />
    );
  }
);

NumericInput.displayName = 'NumericInput';