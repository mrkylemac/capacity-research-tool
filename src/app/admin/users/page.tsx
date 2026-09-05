import Link from 'next/link';
import { requireAdmin } from '@/lib/auth-guard';
import { listUsers } from '@/lib/users';
import { UsersClient, type UserRow } from './users-client';

export const metadata = { title: 'Users — Slow Folk' };

// Approval state changes constantly and must never be served stale.
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await listUsers();

  const rows: UserRow[] = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    approved: user.approved,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    approvedAt: user.approvedAt ? user.approvedAt.toISOString() : null,
  }));

  return (
    <main className="min-h-screen">
      <div className="page-container">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Approve who can see the reports. Signed in as {admin.email}.
            </p>
          </div>
          {/* Sign-out lives in the account bar above — no need to repeat it. */}
          <Link href="/" className="text-sm text-primary underline underline-offset-4 shrink-0">
            Reports
          </Link>
        </div>

        <UsersClient users={rows} currentUserId={admin.id} />
      </div>
    </main>
  );
}
