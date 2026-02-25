"use client";

import type { PropsWithChildren } from 'react';
import { useRouter } from 'next/navigation';
import { RouterProvider } from 'react-aria-components';
import { ThemeProvider as NextThemeProvider } from 'next-themes';

declare module 'react-aria-components' {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>['push']>[1]>;
  }
}

export function Providers({ children }: PropsWithChildren) {
  const router = useRouter();

  return (
    <RouterProvider navigate={router.push}>
      <NextThemeProvider
        attribute="class"
        value={{ light: 'light-mode', dark: 'dark-mode' }}
        disableTransitionOnChange
      >
        {children}
      </NextThemeProvider>
    </RouterProvider>
  );
}

