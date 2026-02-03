import type { ReactElement } from 'react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/utils/cn';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function OtpInput({
  length = 4,
  value,
  onChange,
  error,
  disabled = false,
}: OtpInputProps): ReactElement {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [localValues, setLocalValues] = useState<string[]>(
    Array(length).fill('')
  );

  // Sync local values with external value
  useEffect(() => {
    const chars = value.split('');
    const newValues = Array(length)
      .fill('')
      .map((_, i) => chars[i] || '');
    setLocalValues(newValues);
  }, [value, length]);

  const handleChange = useCallback(
    (index: number, inputValue: string) => {
      // Only accept digits
      const digit = inputValue.replace(/\D/g, '').slice(-1);

      const newValues = [...localValues];
      newValues[index] = digit;
      setLocalValues(newValues);

      // Update parent value
      onChange(newValues.join(''));

      // Auto-focus next input
      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [localValues, length, onChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle backspace
      if (e.key === 'Backspace' && !localValues[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      // Handle arrow keys
      if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      if (e.key === 'ArrowRight' && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [localValues, length]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
      const chars = pastedData.slice(0, length).split('');

      const newValues = Array(length)
        .fill('')
        .map((_, i) => chars[i] || localValues[i] || '');
      setLocalValues(newValues);
      onChange(newValues.join(''));

      // Focus the appropriate input
      const focusIndex = Math.min(chars.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    },
    [length, localValues, onChange]
  );

  return (
    <div>
      <div className="flex justify-center gap-3">
        {Array(length)
          .fill(null)
          .map((_, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={localValues[index]}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                'w-14 h-14 text-center text-2xl font-semibold rounded-lg border bg-white',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                'transition-colors',
                error
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{ borderColor: error ? undefined : '#DDE5E9' }}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}
    </div>
  );
}
