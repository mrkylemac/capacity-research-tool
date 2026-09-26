import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import type { CachedVenueEntry } from '@/lib/venueCache';
import { requireApprovedUserForApi } from '@/lib/auth-guard';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');
const IMAGES_FILE = path.join(process.cwd(), 'src', 'data', 'venue-images.json');

/** Read the static fallback image map (id → url). */
function readStaticImages(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(IMAGES_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

/** Extract profile images from any venue JSON files that exist on disk. */
function readVenueFileImages(): Record<string, string> {
  const images: Record<string, string> = {};
  if (!fs.existsSync(VENUES_DIR)) return images;
  for (const file of fs.readdirSync(VENUES_DIR)) {
    if (!file.endsWith('.json')) continue;
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(VENUES_DIR, file), 'utf-8')) as CachedVenueEntry;
      if (entry.hostId && entry.hostInfo?.profileImage) {
        images[entry.hostId] = entry.hostInfo.profileImage;
      }
    } catch {
      // skip malformed files
    }
  }
  return images;
}

export async function GET(): Promise<NextResponse> {
  const { error: authError } = await requireApprovedUserForApi();
  if (authError) return authError;

  // Venue JSON files are authoritative (most recently fetched).
  // Fall back to the static file for venues that haven't been fetched yet.
  const staticImages = readStaticImages();
  const venueFileImages = readVenueFileImages();
  const merged = { ...staticImages, ...venueFileImages };
  return NextResponse.json(merged);
}
