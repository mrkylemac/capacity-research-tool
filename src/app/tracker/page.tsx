import { TrackerClient } from './tracker-client';
import { requireApprovedUser } from '@/lib/auth-guard';

export const metadata = { title: 'Financial Tracker — Slow Folk' };

export default async function TrackerPage() {
  await requireApprovedUser();

  return <TrackerClient />;
}
