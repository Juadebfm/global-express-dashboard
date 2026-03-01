import type { ReactElement, ImgHTMLAttributes } from 'react';
import { cn } from '@/utils';

type FlagCode = 'us' | 'kr';

interface FlagIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  code: FlagCode;
  size?: 'sm' | 'md' | 'lg';
}

const FLAG_SRC: Record<FlagCode, string> = {
  us: '/images/flags/us.svg',
  kr: '/images/flags/kr.svg',
};

const FLAG_ALT: Record<FlagCode, string> = {
  us: 'US flag',
  kr: 'KR flag',
};

const SIZE_CLASSES: Record<NonNullable<FlagIconProps['size']>, string> = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-9 w-9',
};

export function FlagIcon({ code, size = 'md', className, ...rest }: FlagIconProps): ReactElement {
  return (
    <img
      src={FLAG_SRC[code]}
      alt={FLAG_ALT[code]}
      className={cn(
        SIZE_CLASSES[size],
        'rounded-full object-cover',
        className,
      )}
      {...rest}
    />
  );
}
