import type { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-2 p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>
        {footer ? (
          <div className="text-center text-sm text-muted-foreground mt-6">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}
