import { useEffect, useId, useState, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Disclosure({
  className,
  defaultOpen,
  summary,
  children,
}: {
  className?: string;
  defaultOpen?: boolean;
  summary: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(!!defaultOpen);

  useEffect(() => {
    setIsOpen(!!defaultOpen);
  }, [defaultOpen]);

  return (
    <details
      className={cn('group', className)}
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary
        className="list-none cursor-pointer select-none"
        aria-controls={id}
        aria-expanded={isOpen}
      >
        {summary}
      </summary>
      <div id={id} className="mt-2">
        {children}
      </div>
    </details>
  );
}

export function DisclosurePanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-border bg-muted/10 p-3', className)} {...props} />;
}

