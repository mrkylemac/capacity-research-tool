import { SaunaMaterialsClient } from './sauna-materials-client';
import { requireApprovedUser } from '@/lib/auth-guard';

export const metadata = { title: 'Sauna Materials — Slow Folk' };

export default async function SaunaMaterialsPage() {
  await requireApprovedUser();

  return <SaunaMaterialsClient />;
}
