import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { auth } from './auth';

export interface AuthedUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  approved: boolean;
  role: string;
}

/**
 * Read the current session straight from the database.
 *
 * Session cookie caching is deliberately off in the auth config, so the
 * `approved` flag here always reflects the live user row — approving or
 * revoking someone takes effect on their very next request rather than
 * whenever their cookie happens to expire.
 *
 * Wrapped in `cache()` so a page that guards itself *and* renders the user bar
 * still only hits the database once per request.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<AuthedUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const user = session.user as typeof session.user & { approved?: boolean; role?: string };

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    approved: user.approved === true,
    role: user.role ?? 'user',
  };
});

/**
 * Gate for protected pages. Sends signed-out visitors to the login form and
 * signed-in but unapproved ones to the holding page.
 */
export async function requireApprovedUser(): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.approved) redirect('/pending');
  return user;
}

/** Gate for the admin area. Approved admins only. */
export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireApprovedUser();
  if (user.role !== 'admin') redirect('/');
  return user;
}

/**
 * Gate for route handlers. Returns the user, or a JSON error response to
 * return as-is. Callers must check `error` before using `user`.
 */
export async function requireApprovedUserForApi(): Promise<
  { user: AuthedUser; error: null } | { user: null; error: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }),
    };
  }

  if (!user.approved) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Account pending approval' }, { status: 403 }),
    };
  }

  return { user, error: null };
}

/** As above, but also requires the admin role. */
export async function requireAdminForApi(): Promise<
  { user: AuthedUser; error: null } | { user: null; error: NextResponse }
> {
  const result = await requireApprovedUserForApi();
  if (result.error) return result;

  if (result.user.role !== 'admin') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Admins only' }, { status: 403 }),
    };
  }

  return result;
}
