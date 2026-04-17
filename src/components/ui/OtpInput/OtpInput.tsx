import type { ReactElement } from 'react';
import { useRef, useMemo, useCallback } from 'react';
import { cn } from '@/utils/cn';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 4,
  value,
  onChange,
  error,
  disabled = false,
  autoFocus = false,
}: OtpInputProps): ReactElement {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = useMemo(() => {
    const chars = value.split('');
    return Array(length)
      .fill('')
      .map((_, i) => chars[i] || '');
  }, [value, length]);

  const applyChunkAtIndex = useCallback(
    (startIndex: number, chunk: string) => {
      const sanitizedChunk = chunk.replace(/\D/g, '').slice(0, length - startIndex);
      if (!sanitizedChunk) {
        return;
      }

      const newValues = [...digits];
      sanitizedChunk.split('').forEach((digit, offset) => {
        const targetIndex = startIndex + offset;
        if (targetIndex < length) {
          newValues[targetIndex] = digit;
        }
      });

      onChange(newValues.join(''));

      const nextFocusIndex = Math.min(startIndex + sanitizedChunk.length, length - 1);
      inputRefs.current[nextFocusIndex]?.focus();
    },
    [digits, length, onChange]
  );

  const handleChange = useCallback(
    (index: number, inputValue: string) => {
      const sanitizedValue = inputValue.replace(/\D/g, '');

      if (!sanitizedValue) {
        const newValues = [...digits];
        newValues[index] = '';
        onChange(newValues.join(''));
        return;
      }

      // Handle full-code autofill or multi-digit typing in one field.
      if (sanitizedValue.length > 1) {
        applyChunkAtIndex(index, sanitizedValue);
        return;
      }

      const digit = sanitizedValue.slice(-1);
      const newValues = [...digits];
      newValues[index] = digit;
      onChange(newValues.join(''));

      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [applyChunkAtIndex, digits, length, onChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle backspace
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
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
    [digits, length]
  );

  const handlePaste = useCallback(
    (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text');
      applyChunkAtIndex(index, pastedData);
    },
    [applyChunkAtIndex]
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
              pattern="[0-9]*"
              maxLength={1}
              value={digits[index]}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(index, e)}
              disabled={disabled}
              autoFocus={autoFocus && index === 0}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              onFocus={(e) => e.currentTarget.select()}
              className={cn(
                'w-14 h-14 text-center text-sm font-semibold rounded-lg border bg-white',
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
