"use client";

import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RouterProvider } from 'react-aria-components';
import { ThemeProvider as NextThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

declare module 'react-aria-components' {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>['push']>[1]>;
  }
}

export function Providers({ children }: PropsWithChildren) {
  const router = useRouter();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider navigate={router.push}>
        <NextThemeProvider
          attribute="class"
          value={{ light: 'light-mode', dark: 'dark-mode' }}
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
        </NextThemeProvider>
      </RouterProvider>
    </QueryClientProvider>
  );
}

