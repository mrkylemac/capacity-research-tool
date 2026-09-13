'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  approved: boolean;
  role: string;
  createdAt: string;
  approvedAt: string | null;
}

export interface InviteRow {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

interface UsersClientProps {
  users: UserRow[];
  invites: InviteRow[];
  currentUserId: string;
}

export function UsersClient({ users, invites, currentUserId }: UsersClientProps) {
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

  const revokeInvite = async (inviteId: string) => {
    setBusyId(inviteId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invites?id=${encodeURIComponent(inviteId)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || 'Could not revoke that invite.');
        return;
      }
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AddPerson onDone={() => router.refresh()} />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {invites.length > 0 ? (
        <InviteSection invites={invites} busyId={busyId} onRevoke={revokeInvite} />
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

type AddResult =
  | { status: 'invited'; email: string; link: string; emailStatus: 'sent' | 'skipped' | 'failed' }
  | { status: 'approved' | 'already-approved'; email: string };

function AddPerson({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddResult | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || 'Could not add that person.');
        return;
      }
      setResult(payload as AddResult);
      setEmail('');
      onDone();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Add someone</h2>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            autoComplete="off"
            required
            placeholder="name@example.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add'}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-destructive mt-3">
          {error}
        </p>
      ) : null}

      {result?.status === 'approved' ? (
        <p className="text-sm mt-3">{result.email} already had an account waiting, and now has access.</p>
      ) : null}
      {result?.status === 'already-approved' ? (
        <p className="text-sm mt-3">{result.email} already has access.</p>
      ) : null}
      {result?.status === 'invited' ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm">
            {result.emailStatus === 'sent'
              ? `Invite emailed to ${result.email}. You can also send them this link:`
              : `Send ${result.email} this link. They will be let straight in when they sign up with that address:`}
          </p>
          <div className="flex gap-2">
            <Input readOnly value={result.link} onFocus={event => event.currentTarget.select()} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => copy(result.link)}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The link works once and expires in 14 days. It is only shown now, so copy it before leaving this page.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function InviteSection({
  invites,
  busyId,
  onRevoke,
}: {
  invites: InviteRow[];
  busyId: string | null;
  onRevoke: (inviteId: string) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Invited
        <span className="ml-2 font-normal normal-case">({invites.length})</span>
      </h2>
      <ul className="space-y-2">
        {invites.map(invite => (
          <li
            key={invite.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border rounded-xl p-4"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{invite.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Invited {formatDate(invite.createdAt)} · link expires {formatDate(invite.expiresAt)}
              </p>
            </div>
            <div className="shrink-0">
              <Button variant="outline" size="sm" disabled={busyId === invite.id} onClick={() => onRevoke(invite.id)}>
                {busyId === invite.id ? 'Working…' : 'Revoke invite'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
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
