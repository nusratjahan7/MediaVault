import type { InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  className,
  ...props
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
      aria-label={label}
      className={cn(
        'size-4 shrink-0 cursor-pointer rounded border-border accent-accent focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  );
}
