import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { cn } from '@/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps): ReactElement {
  return (
    <div
      className={cn(
        'rounded-xl p-6',
        className
      )}
      style={{
        backgroundColor: '#F5F7FA',
        border: '1px solid #DDE5E9',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
