import { ArrowDownToLine } from 'lucide-react';
import { cn } from '@/utils/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#6d6df0] to-[#3b3bb8] text-white shadow-sm',
        className,
      )}
      aria-hidden="true"
    >
      <ArrowDownToLine className="size-4" strokeWidth={2.4} />
    </div>
  );
}
