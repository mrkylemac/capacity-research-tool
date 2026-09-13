import { redirect } from 'next/navigation';
import { isGoogleAuthEnabled } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth-guard';
import { SignupClient } from './signup-client';

export const metadata = { title: 'Request access — Slow Folk' };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.approved ? '/' : '/pending');

  const { invite } = await searchParams;
  const inviteToken = typeof invite === 'string' && invite ? invite : null;

  return <SignupClient googleEnabled={isGoogleAuthEnabled} inviteToken={inviteToken} />;
}
