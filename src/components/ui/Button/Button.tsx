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

// Button sizes — tuned 2026-06-03 (second pass) after CTA height feedback.
// Page-level CTAs in DashboardHeader / ShipmentsHeader / etc. are mostly
// passing size="sm" today, so the previous bump didn't reach them. New
// targets:
//   sm  ≈ 40px tall  — even compact actions clear the "strip" feel
//   md  ≈ 48px tall  — workhorse form buttons
//   lg  ≈ 56px tall  — primary page-level CTAs (sticky footers, modal confirms)
const sizeStyles: Record<string, string> = {
  sm: 'px-3.5 py-2.5 text-sm',
  md: 'px-5 py-3 text-base',
  lg: 'px-7 py-4 text-base',
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
          // (rounded-xl) so CTAs visually rhyme with surrounding card
          // chrome. shadow-sm gives a subtle lift that disappears under
          // ghost/secondary variants where the bg is transparent or
          // identical to the surface. Font weight intentionally kept at
          // `medium` per UX feedback — semibold reads too heavy alongside
          // the dashboard's lighter card copy.
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium shadow-sm transition-colors',
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
