'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp, signIn } from '@/lib/auth-client';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_PASSWORD_LENGTH = 10;

interface SignupClientProps {
  googleEnabled: boolean;
  /** Present when the person arrived through an admin's invite link. */
  inviteToken?: string | null;
}

type InviteState =
  | { kind: 'none' }
  | { kind: 'checking' }
  | { kind: 'valid'; email: string }
  | { kind: 'invalid'; message: string };

export function SignupClient({ googleEnabled, inviteToken = null }: SignupClientProps) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<InviteState>(inviteToken ? { kind: 'checking' } : { kind: 'none' });

  // Opening the invite sets the cookie the signup request carries, and tells us
  // which address it is for so the form can't be filled in with another one.
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    fetch(`/api/invites?token=${encodeURIComponent(inviteToken)}`)
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.ok && payload.email) {
          setInvite({ kind: 'valid', email: payload.email });
          setEmail(payload.email);
        } else {
          setInvite({
            kind: 'invalid',
            message: payload.error || 'This invite has expired or has already been used.',
          });
        }
      })
      .catch(() => {
        if (!cancelled) setInvite({ kind: 'invalid', message: 'Could not check your invite.' });
      });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const invited = invite.kind === 'valid';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setBusy(true);

    const { error: signUpError } = await signUp.email({ name, email, password });

    if (signUpError) {
      setError(signUpError.message || 'Could not create your account.');
      setBusy(false);
      return;
    }

    // `autoSignIn` is off, so there is no session to land in. An invited account
    // is already approved and just needs signing in; anyone else waits for review.
    router.push(invited ? '/login?invited=1' : '/pending?new=1');
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    await signIn.social({ provider: 'google', callbackURL: '/' });
  };

  return (
    <AuthShell
      title={invited ? "You're invited" : 'Request access'}
      subtitle={
        invited
          ? 'Create your account and you will be let straight in.'
          : "New accounts are reviewed by hand before they're switched on."
      }
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      {invite.kind === 'invalid' ? (
        <p role="alert" className="text-sm text-destructive mb-4">
          {invite.message} You can still request access below.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={event => setName(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            // The invite only lets in the address it was issued for.
            readOnly={invited}
          />
          {invited ? (
            <p className="text-xs text-muted-foreground">Your invite is for this address.</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy || invite.kind === 'checking'}>
          {busy ? 'Creating account…' : invited ? 'Create account' : 'Request access'}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 my-5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleButton onClick={handleGoogle} disabled={busy} label="Sign up with Google" />
        </>
      ) : null}
    </AuthShell>
  );
}
