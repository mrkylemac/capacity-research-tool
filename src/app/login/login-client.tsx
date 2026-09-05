'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginClientProps {
  googleEnabled: boolean;
}

export function LoginClient({ googleEnabled }: LoginClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const { error: signInError } = await signIn.email({ email, password });

    if (signInError) {
      setError(signInError.message || 'Could not sign you in. Check your email and password.');
      setBusy(false);
      return;
    }

    // The destination is gated server-side, so an unapproved account lands on
    // /pending from here rather than seeing any data.
    router.push(next);
    router.refresh();
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    await signIn.social({ provider: 'google', callbackURL: next });
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Slow Folk Sauna House"
      footer={
        <>
          No account yet?{' '}
          <Link href="/signup" className="text-primary underline underline-offset-4">
            Request access
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 my-5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleButton onClick={handleGoogle} disabled={busy} />
        </>
      ) : null}
    </AuthShell>
  );
}
