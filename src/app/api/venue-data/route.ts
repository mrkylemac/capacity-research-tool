import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import type { CachedVenueEntry } from '@/lib/venueCache';
import { requireApprovedUserForApi } from '@/lib/auth-guard';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

function venueFilePath(hostId: string, platform: string): string {
  return path.join(VENUES_DIR, `${hostId}-${platform}.json`);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { error: authError } = await requireApprovedUserForApi();
  if (authError) return authError;

  const hostId = request.nextUrl.searchParams.get('hostId');
  const platform = request.nextUrl.searchParams.get('platform');

  if (!hostId || !platform) {
    return NextResponse.json({ error: 'Missing hostId or platform' }, { status: 400 });
  }

  const filePath = venueFilePath(hostId, platform);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'No data found for this venue' }, { status: 404 });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const entry = JSON.parse(raw) as CachedVenueEntry;
    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: 'Failed to read venue data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { error: authError } = await requireApprovedUserForApi();
  if (authError) return authError;

  let body: { entry: CachedVenueEntry };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { entry } = body;
  if (!entry?.hostId || !entry?.platform) {
    return NextResponse.json({ error: 'Missing entry.hostId or entry.platform' }, { status: 400 });
  }

  const filePath = venueFilePath(entry.hostId, entry.platform);

  try {
    fs.mkdirSync(VENUES_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to write venue data' }, { status: 500 });
  }
}
