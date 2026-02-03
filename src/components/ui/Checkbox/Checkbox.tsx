import { forwardRef } from 'react';
import { cn } from '@/utils';
import type { CheckboxProps } from './Checkbox.types';

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            'h-4 w-4 rounded border-gray-300 text-brand-500',
            'focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
            'cursor-pointer transition-colors',
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="text-sm text-gray-600 cursor-pointer select-none"
        >
          {label}
        </label>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
