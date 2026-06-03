import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';
import type { ButtonProps } from './Button.types';

const variantStyles: Record<string, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-500 disabled:bg-brand-300',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
};

// Button sizes — tuned 2026-06-03 to make CTAs read as actions rather than
// strip-style labels. `sm` keeps inline-actions compact (table rows,
// dropdown menus); `md` is the default workhorse; `lg` is for primary
// page-level CTAs (sticky footers, modal confirms).
const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base — pulled together with the slightly larger radius
          // (rounded-xl) + semibold weight so CTAs feel weighty across
          // the app. shadow-sm gives a subtle lift that disappears under
          // ghost/secondary variants where the bg is transparent or
          // identical to the surface.
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
