'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  approved: boolean;
  role: string;
  createdAt: string;
  approvedAt: string | null;
}

interface UsersClientProps {
  users: UserRow[];
  currentUserId: string;
}

export function UsersClient({ users, currentUserId }: UsersClientProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateApproval = async (userId: string, approved: boolean) => {
    setBusyId(userId);
    setError(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approved }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || 'Could not update that account.');
        return;
      }

      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusyId(null);
    }
  };

  const pending = users.filter(user => !user.approved);
  const approved = users.filter(user => user.approved);

  return (
    <div className="space-y-8">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <UserSection
        title="Awaiting approval"
        emptyMessage="No one is waiting."
        users={pending}
        currentUserId={currentUserId}
        busyId={busyId}
        onUpdate={updateApproval}
      />

      <UserSection
        title="Has access"
        emptyMessage="No approved accounts yet."
        users={approved}
        currentUserId={currentUserId}
        busyId={busyId}
        onUpdate={updateApproval}
      />
    </div>
  );
}

interface UserSectionProps {
  title: string;
  emptyMessage: string;
  users: UserRow[];
  currentUserId: string;
  busyId: string | null;
  onUpdate: (userId: string, approved: boolean) => void;
}

function UserSection({ title, emptyMessage, users, currentUserId, busyId, onUpdate }: UserSectionProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}
        <span className="ml-2 font-normal normal-case">({users.length})</span>
      </h2>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2">
          {users.map(user => (
            <li
              key={user.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border rounded-xl p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{user.name || user.email}</p>
                  {user.role === 'admin' ? <Badge variant="secondary">Admin</Badge> : null}
                  {user.id === currentUserId ? <Badge variant="outline">You</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Signed up {formatDate(user.createdAt)}
                  {user.approvedAt ? ` · approved ${formatDate(user.approvedAt)}` : ''}
                </p>
              </div>

              <div className="shrink-0">
                {user.approved ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === user.id || user.id === currentUserId}
                    onClick={() => onUpdate(user.id, false)}
                  >
                    {busyId === user.id ? 'Working…' : 'Revoke access'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busyId === user.id}
                    onClick={() => onUpdate(user.id, true)}
                  >
                    {busyId === user.id ? 'Working…' : 'Approve'}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
