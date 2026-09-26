import { NextRequest, NextResponse } from 'next/server';
import { requireAdminForApi } from '@/lib/auth-guard';
import { createInvite, revokeInvite } from '@/lib/invites';
import { buildInviteEmail } from '@/lib/inviteEmail';
import { looksLikeEmail, normaliseEmail } from '@/lib/inviteTokens';
import { findUserByEmail, setUserApproval } from '@/lib/users';
import { sendEmail } from '@/lib/email';

/**
 * Add someone from the dashboard.
 *
 * If they already have an account waiting, it is simply approved. Otherwise an
 * invite link is issued: returned here so the admin can copy it, and emailed
 * too when email is configured.
 */
export async function POST(request: NextRequest) {
  const { user: admin, error } = await requireAdminForApi();
  if (error) return error;

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.email !== 'string' || !looksLikeEmail(body.email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }
  const email = normaliseEmail(body.email);

  const existing = await findUserByEmail(email);
  if (existing?.approved) {
    return NextResponse.json({ status: 'already-approved', email });
  }
  if (existing) {
    await setUserApproval(existing.id, true);
    return NextResponse.json({ status: 'approved', email });
  }

  const { token, invite } = await createInvite(email, admin.id);
  // The origin the admin is using, so the link works on previews as well as
  // production.
  const link = `${request.nextUrl.origin}/signup?invite=${encodeURIComponent(token)}`;

  const sent = await sendEmail(
    buildInviteEmail({ to: email, link, invitedBy: admin.name, expiresAt: invite.expiresAt }),
  );

  return NextResponse.json({
    status: 'invited',
    email,
    link,
    expiresAt: invite.expiresAt,
    emailStatus: sent.status,
  });
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdminForApi();
  if (error) return error;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Expected ?id=' }, { status: 400 });

  const removed = await revokeInvite(id);
  if (!removed) return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
