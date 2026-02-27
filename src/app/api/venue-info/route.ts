import { NextRequest, NextResponse } from 'next/server';

export interface PlaceInfo {
  name: string;
  address: string;
  suburb: string;
  phone?: string;
  website?: string;
  rating?: number;
  mapsUrl?: string;
}

function extractSuburb(address: string): string {
  // Extract suburb from formatted address like "123 Street, Fitzroy North VIC 3068, Australia"
  const parts = address.split(',');
  if (parts.length >= 2) {
    const suburbPart = parts[1].trim();
    // Remove state/postcode: "Fitzroy North VIC 3068" → "Fitzroy North"
    return suburbPart.replace(/\s+[A-Z]{2,3}\s+\d{4}.*$/, '').trim();
  }
  return address;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');
  if (!query) {
    return NextResponse.json({ error: 'query param required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY not configured' }, { status: 503 });
  }

  try {
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    searchUrl.searchParams.set('query', query);
    searchUrl.searchParams.set('key', apiKey);

    const searchRes = await fetch(searchUrl.toString());
    const searchData = await searchRes.json();

    const place = searchData.results?.[0];
    if (!place) {
      return NextResponse.json({ error: 'No place found' }, { status: 404 });
    }

    // Fetch details for phone + website
    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', place.place_id);
    detailsUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,website,rating,url');
    detailsUrl.searchParams.set('key', apiKey);

    const detailsRes = await fetch(detailsUrl.toString());
    const detailsData = await detailsRes.json();
    const detail = detailsData.result ?? place;

    const address: string = detail.formatted_address ?? place.formatted_address ?? '';
    const info: PlaceInfo = {
      name: detail.name ?? place.name,
      address,
      suburb: extractSuburb(address),
      phone: detail.formatted_phone_number,
      website: detail.website,
      rating: detail.rating ?? place.rating,
      mapsUrl: detail.url,
    };

    return NextResponse.json(info);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
