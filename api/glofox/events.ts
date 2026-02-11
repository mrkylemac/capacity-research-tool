/**
 * Server-side proxy for Glofox events API.
 * Forwards GET /api/glofox/events?... to https://api.glofox.com/2.0/events
 * with query params and auth headers. Avoids CORS when the frontend calls same-origin.
 */
const GLOFOX_EVENTS_URL = 'https://api.glofox.com/2.0/events';

const FORWARD_HEADERS = [
  'authorization',
  'x-glofox-branch-id',
  'x-glofox-branch-timezone',
  'x-glofox-source',
] as const;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const params = url.searchParams;

  const targetUrl = new URL(GLOFOX_EVENTS_URL);
  params.forEach((value, key) => targetUrl.searchParams.set(key, value));

  const headers: Record<string, string> = {
    accept: 'application/json',
  };
  FORWARD_HEADERS.forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  });

  const res = await fetch(targetUrl.toString(), { method: 'GET', headers });

  const body = await res.text();
  const response = new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json',
      'access-control-allow-origin': '*',
    },
  });
  return response;
}
