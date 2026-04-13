import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { cn } from '@/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps): ReactElement {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#DDE5E9] bg-[#F5F7FA] p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
