import type { InputHTMLAttributes } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  type?: 'text' | 'email' | 'password';
  showPasswordToggle?: boolean;
}
