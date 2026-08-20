'use client';

import { useState } from 'react';
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
}

export function SignupClient({ googleEnabled }: SignupClientProps) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

    // Accounts start unapproved and `autoSignIn` is off, so there is no session
    // to land in — go straight to the holding page.
    router.push('/pending?new=1');
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    await signIn.social({ provider: 'google', callbackURL: '/' });
  };

  return (
    <AuthShell
      title="Request access"
      subtitle="New accounts are reviewed by hand before they're switched on."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
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
          />
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

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Creating account…' : 'Request access'}
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
