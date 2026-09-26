import { ReportClient } from './report-client';
import { requireApprovedUser } from '@/lib/auth-guard';

export default async function ReportPage() {
  await requireApprovedUser();

  return <ReportClient />;
}

