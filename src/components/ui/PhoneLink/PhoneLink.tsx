import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils';
import { phoneHref } from './phoneHref';

interface PhoneLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'> {
  phone: string;
  children?: ReactNode;
}

/** A displayed contact number that opens the device's calling app. */
export function PhoneLink({
  phone,
  children,
  className,
  'aria-label': ariaLabel,
  ...props
}: PhoneLinkProps) {
  return (
    <a
      {...props}
      href={phoneHref(phone)}
      aria-label={ariaLabel ?? `Call ${phone}`}
      className={cn(
        'max-w-full break-words text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        className,
      )}
    >
      {children ?? phone}
    </a>
  );
}
