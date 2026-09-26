import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { isGoogleAuthEnabled } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth-guard';
import { LoginClient } from './login-client';

export const metadata = { title: 'Sign in — Slow Folk' };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.approved ? '/' : '/pending');

  return (
    <Suspense>
      <LoginClient googleEnabled={isGoogleAuthEnabled} />
    </Suspense>
  );
}
