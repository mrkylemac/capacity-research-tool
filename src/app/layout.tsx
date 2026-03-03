import type { ReactNode } from 'react';
import '../styles/globals.css';
import { Providers } from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-1 text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

