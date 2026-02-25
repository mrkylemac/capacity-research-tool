import type { HTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Avatar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-xl bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={cn('h-full w-full object-cover', className)} {...props} />;
}

export function AvatarFallback({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center text-muted-foreground font-semibold',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

