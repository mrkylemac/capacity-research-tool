import { Suspense } from 'react';
import { HomeClient } from './home-client';
import { requireApprovedUser } from '@/lib/auth-guard';

export default async function HomePage() {
  await requireApprovedUser();

  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}

