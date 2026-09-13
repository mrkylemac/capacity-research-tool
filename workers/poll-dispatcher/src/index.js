/**
 * Triggers the "Poll future-only venues" GitHub Actions workflow every 15
 * minutes.
 *
 * GitHub's own `schedule` trigger is best effort and drops runs under load.
 * Against a 15-minute cron it delivered 36 runs a day at best and 6 a day by
 * September 2026, which left Navia's last reading of a sitting one to four
 * hours before it started. Runs started through the API are not throttled, so
 * this worker supplies the beat and the workflow's own time gates still decide
 * what actually gets polled.
 *
 * Deliberately does nothing but dispatch. It does not pass `force`, so the
 * workflow's gates apply; forcing every venue and both deep refreshes every 15
 * minutes would hammer the venues' booking APIs.
 */

const GITHUB_API = 'https://api.github.com';

async function dispatch(env) {
  if (!env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN secret is not set (npx wrangler secret put GITHUB_TOKEN)');
  }

  const url = `${GITHUB_API}/repos/${env.GITHUB_REPO}/actions/workflows/${env.WORKFLOW_FILE}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      // GitHub rejects API requests without a User-Agent.
      'User-Agent': 'slowfolk-poll-dispatcher',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: env.GIT_REF || 'main' }),
  });

  // A successful dispatch is 204 with no body. Anything else is thrown so the
  // invocation shows as failed in the Cloudflare dashboard rather than quietly
  // succeeding. The common failure is 401 once the token expires.
  if (res.status !== 204) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Workflow dispatch failed: HTTP ${res.status} ${detail}`);
  }
}

export default {
  async scheduled(controller, env) {
    await dispatch(env);
  },

  // No HTTP interface. A public URL that fired the workflow would let anyone
  // spend the token.
  async fetch() {
    return new Response('Not found', { status: 404 });
  },
};
