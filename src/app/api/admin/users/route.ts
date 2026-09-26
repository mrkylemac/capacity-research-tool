import { NextRequest, NextResponse } from 'next/server';
import { requireAdminForApi } from '@/lib/auth-guard';
import { setUserApproval } from '@/lib/users';

export async function PATCH(request: NextRequest) {
  const { user: admin, error } = await requireAdminForApi();
  if (error) return error;

  let body: { userId?: unknown; approved?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, approved } = body;

  if (typeof userId !== 'string' || typeof approved !== 'boolean') {
    return NextResponse.json(
      { error: 'Expected { userId: string, approved: boolean }' },
      { status: 400 },
    );
  }

  // Without this an admin could revoke their own access and lock everyone out.
  if (userId === admin.id && approved === false) {
    return NextResponse.json({ error: 'You cannot revoke your own access' }, { status: 400 });
  }

  const updated = await setUserApproval(userId, approved);

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: updated });
}
