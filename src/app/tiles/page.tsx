import { TilesClient } from './tiles-client';
import { requireApprovedUser } from '@/lib/auth-guard';

export const metadata = { title: 'Tile Planner — Slow Folk' };

export default async function TilesPage() {
  await requireApprovedUser();

  return <TilesClient />;
}
