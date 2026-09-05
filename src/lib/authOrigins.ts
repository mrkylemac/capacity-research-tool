/**
 * Where the app is allowed to be reached from.
 *
 * Better Auth rejects any request whose `Origin` header is not in
 * `trustedOrigins`, and that list defaults to the single `baseURL` value. On
 * Vercel that default is never enough: every deployment gets its own hostname,
 * a new one is minted on each push, and the production domain does not have to
 * match the project name. A `BETTER_AUTH_URL` that is one character off, or a
 * preview opened on its own URL, both come back as "Invalid origin" with no
 * hint on the page about which host was refused.
 *
 * So the trusted list is built from the Vercel system variables as well, which
 * only ever name hostnames Vercel assigned to this project:
 *
 *   VERCEL_PROJECT_PRODUCTION_URL  the production domain
 *   VERCEL_BRANCH_URL              the per-branch host
 *   VERCEL_URL                     the per-deployment host
 *
 * These are hostnames without a protocol, hence `toOrigin`.
 */

/** `https://example.com/` and `example.com` both become `https://example.com`. */
export function toOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).origin;
  } catch {
    return undefined;
  }
}

/**
 * The public URL Better Auth builds its links from.
 *
 * A trailing slash is trimmed rather than passed through: Better Auth compares
 * origins by exact string, so `https://example.com/` never matches a browser's
 * `https://example.com`.
 */
export function resolveBaseURL(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL.replace(/\/+$/, '');
  // Vercel sets VERCEL_URL to the deployment host without a protocol.
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return undefined;
}

/**
 * Origins allowed to make auth requests, deduplicated and in preference order.
 *
 * Better Auth appends this to the origin it derives from `baseURL`, so the
 * result is additive — nothing here removes a host that already worked.
 */
export function resolveTrustedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const candidates = [
    env.BETTER_AUTH_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
    env.VERCEL_BRANCH_URL,
    env.VERCEL_URL,
  ];

  const origins = candidates
    .map(toOrigin)
    .filter((origin): origin is string => Boolean(origin));

  return [...new Set(origins)];
}
