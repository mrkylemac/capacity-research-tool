import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-border bg-background px-3 text-base text-foreground',
        'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
        className,
      )}
      {...props}
    />
  );
}

