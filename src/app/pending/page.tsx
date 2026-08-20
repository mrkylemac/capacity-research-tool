import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-guard';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const metadata = { title: 'Pending approval — Slow Folk' };

interface PendingPageProps {
  searchParams: Promise<{ new?: string }>;
}

export default async function PendingPage({ searchParams }: PendingPageProps) {
  const user = await getCurrentUser();

  // Approved users have no business here.
  if (user?.approved) redirect('/');

  const { new: isNew } = await searchParams;

  return (
    <AuthShell
      title={isNew ? 'Account created' : 'Pending approval'}
      subtitle={
        isNew
          ? 'Your request has been logged. Access is granted manually, so you will not be able to sign in until it is approved.'
          : 'Your account exists but has not been approved yet. You will be able to sign in once it is.'
      }
    >
      <div className="space-y-4">
        {user ? (
          <>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="text-foreground font-medium">{user.email}</span>
            </p>
            <SignOutButton className="w-full" />
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm text-primary underline underline-offset-4"
          >
            Back to sign in
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
