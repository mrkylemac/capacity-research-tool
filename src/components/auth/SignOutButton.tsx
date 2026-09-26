'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';

interface SignOutButtonProps {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}

export function SignOutButton({ variant = 'outline', size = 'sm', className }: SignOutButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <Button variant={variant} size={size} className={className} onClick={handleSignOut} disabled={busy}>
      {busy ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
