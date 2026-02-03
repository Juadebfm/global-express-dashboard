import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { cn } from '@/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps): ReactElement {
  return (
    <div
      className={cn(
        'rounded-xl bg-white p-6 shadow-card',
        'transition-shadow hover:shadow-card-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
