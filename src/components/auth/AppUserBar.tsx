import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth-guard';
import { SignOutButton } from './SignOutButton';

/**
 * Slim account strip shown above every signed-in page.
 *
 * Renders nothing for signed-out or unapproved visitors, which keeps it out of
 * the way on the login, signup and pending screens.
 */
export async function AppUserBar() {
  const user = await getCurrentUser();
  if (!user?.approved) return null;

  return (
    <div className="border-b border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-12 flex items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground truncate">{user.email}</span>
        {user.role === 'admin' ? (
          <Link
            href="/admin/users"
            className="text-sm text-primary underline underline-offset-4 shrink-0"
          >
            Users
          </Link>
        ) : null}
        <SignOutButton />
      </div>
    </div>
  );
}
