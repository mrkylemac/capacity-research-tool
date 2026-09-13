/**
 * Invite links: the pure parts, kept free of the database and of `server-only`
 * so they can be tested directly.
 *
 * An invite lets an admin add someone ahead of time. Signups here do not verify
 * the email address, so trusting a typed-in address alone would let anyone who
 * knows it sign up in that person's name and be approved on the spot. An invite
 * is therefore a secret link bound to one address: approval needs both the link
 * and a signup with the matching email.
 *
 * Only a hash of the token is stored, so a database read does not hand out
 * usable links.
 */
import { createHash, randomBytes } from 'node:crypto';

/** Cookie carrying the invite token from the link to the signup request. */
export const INVITE_COOKIE = 'sf_invite';

/** How long a link stays usable. */
export const INVITE_TTL_DAYS = 14;

/** How long the cookie lasts once the link is opened: long enough to sign up. */
export const INVITE_COOKIE_MAX_AGE_SECONDS = 60 * 60;

export interface InviteRecord {
  id: string;
  email: string;
  expiresAt: Date;
  acceptedAt: Date | null;
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** A loose shape check, enough to catch typos before creating an invite. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Read one cookie out of a raw `Cookie` header. */
export function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    const raw = part.slice(index + 1).trim();
    try {
      return decodeURIComponent(raw) || null;
    } catch {
      return raw || null;
    }
  }
  return null;
}

/**
 * The `Cookie` header from whatever request context Better Auth hands a
 * database hook. It is null outside a request (a script creating a user), and
 * `headers` may arrive as a Headers instance or a plain object.
 */
export function cookieHeaderFrom(context: unknown): string | null {
  if (!context || typeof context !== 'object') return null;
  const ctx = context as { request?: { headers?: Headers }; headers?: unknown };

  const fromRequest = ctx.request?.headers?.get?.('cookie');
  if (fromRequest) return fromRequest;

  const headers = ctx.headers;
  if (headers && typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get('cookie');
  }
  if (headers && typeof headers === 'object') {
    const record = headers as Record<string, string | undefined>;
    return record.cookie ?? record.Cookie ?? null;
  }
  return null;
}

/** Whether an invite can still approve a signup for `email`. */
export function isInviteUsable(invite: InviteRecord | null, email: string, now = new Date()): boolean {
  if (!invite) return false;
  if (invite.acceptedAt) return false;
  if (invite.expiresAt.getTime() <= now.getTime()) return false;
  return normaliseEmail(invite.email) === normaliseEmail(email);
}
