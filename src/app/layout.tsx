import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '../styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="antialiased">
      <body className="min-h-screen bg-gray-1 text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

