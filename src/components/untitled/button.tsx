import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';

  const sizes = size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm';

  const styles =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : variant === 'secondary'
      ? 'bg-muted text-foreground hover:bg-muted/70'
      : variant === 'outline'
      ? 'border border-border bg-background hover:bg-muted/40'
      : 'hover:bg-muted/40';

  return <button type={type} className={cn(base, sizes, styles, className)} {...props} />;
}

