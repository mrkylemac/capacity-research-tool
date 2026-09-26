// The worker runs on Cloudflare, where fetch and Response are globals. Node has
// both too, so the worker module is tested as it ships.
import worker from '../../workers/poll-dispatcher/src/index.js';

const env = {
  GITHUB_TOKEN: 'test-token',
  GITHUB_REPO: 'mrkylemac/capacity-research-tool',
  WORKFLOW_FILE: 'poll-venues.yml',
  GIT_REF: 'main',
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('poll dispatcher worker', () => {
  it('dispatches the poll workflow on main', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await worker.scheduled({}, env);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://api.github.com/repos/mrkylemac/capacity-research-tool/actions/workflows/poll-venues.yml/dispatches',
    );
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.headers['User-Agent']).toBeTruthy();
    expect(JSON.parse(init.body)).toEqual({ ref: 'main' });
  });

  it('never forces a full poll', () => {
    // Forcing every venue and both deep refreshes every 15 minutes would
    // hammer the venues' booking APIs. The workflow's gates must apply.
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    return worker.scheduled({}, env).then(() => {
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.inputs?.force).toBeUndefined();
    });
  });

  it('fails loudly when GitHub refuses, e.g. an expired token', async () => {
    fetchMock.mockResolvedValue(new Response('Bad credentials', { status: 401 }));
    await expect(worker.scheduled({}, env)).rejects.toThrow(/401/);
  });

  it('fails loudly when the token secret is missing', async () => {
    await expect(worker.scheduled({}, { ...env, GITHUB_TOKEN: undefined })).rejects.toThrow(/GITHUB_TOKEN/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exposes nothing over HTTP', async () => {
    const res = await worker.fetch();
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
