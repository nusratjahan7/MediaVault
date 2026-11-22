import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function IconButton({
  label,
  size = 'md',
  className,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-elevated hover:text-fg focus-visible:outline-none disabled:opacity-50',
        size === 'sm' ? 'size-7' : 'size-8',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
