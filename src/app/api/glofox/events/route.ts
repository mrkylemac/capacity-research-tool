export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const upstream = new URL('https://api.glofox.com/2.0/events');
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const res = await fetch(upstream.toString(), {
    headers: {
      authorization: request.headers.get('authorization') ?? '',
      'x-glofox-branch-id': request.headers.get('x-glofox-branch-id') ?? '',
      'x-glofox-branch-timezone': request.headers.get('x-glofox-branch-timezone') ?? '',
      'x-glofox-source': request.headers.get('x-glofox-source') ?? 'webportal',
      accept: 'application/json',
    },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
