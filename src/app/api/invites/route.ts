import { NextRequest, NextResponse } from 'next/server';
import { lookupInvite } from '@/lib/invites';
import { INVITE_COOKIE, INVITE_COOKIE_MAX_AGE_SECONDS } from '@/lib/inviteTokens';

/**
 * Opened by the signup page when it arrives with `?invite=`.
 *
 * Deliberately public: the person has no account yet. It says which address
 * the invite is for, so the form can fill it in, and sets the cookie the signup
 * request carries to the auth hook. The token is 256 random bits, so this
 * cannot be used to guess invites, and it reveals nothing without one.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Expected ?token=' }, { status: 400 });

  const invite = await lookupInvite(token);
  if (!invite) {
    return NextResponse.json({ error: 'This invite has expired or has already been used.' }, { status: 404 });
  }

  const response = NextResponse.json({ email: invite.email });
  response.cookies.set(INVITE_COOKIE, token, {
    httpOnly: true,
    // Lax, not Strict: the Google sign-in callback is a top-level navigation
    // back from Google, and it needs this cookie to approve the account.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: INVITE_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
