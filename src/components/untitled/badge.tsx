import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'brand' | 'success' | 'warning';
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
  const styles =
    variant === 'brand'
      ? 'bg-primary/10 text-primary'
      : variant === 'success'
      ? 'bg-green-500/10 text-green-700'
      : variant === 'warning'
      ? 'bg-amber-500/10 text-amber-700'
      : 'bg-muted text-muted-foreground';

  return <span className={cn(base, styles, className)} {...props} />;
}

