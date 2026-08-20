import { redirect } from 'next/navigation';
import { isGoogleAuthEnabled } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth-guard';
import { SignupClient } from './signup-client';

export const metadata = { title: 'Request access — Slow Folk' };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.approved ? '/' : '/pending');

  return <SignupClient googleEnabled={isGoogleAuthEnabled} />;
}
