import {
  generateInviteToken,
  hashInviteToken,
  readCookie,
  cookieHeaderFrom,
  isInviteUsable,
  looksLikeEmail,
  INVITE_COOKIE,
} from '@/lib/inviteTokens';
import { buildInviteEmail } from '@/lib/inviteEmail';

const now = new Date('2026-09-13T00:00:00Z');
const invite = (over = {}) => ({
  id: 'i1',
  email: 'Ben@SolSaunas.com.au',
  expiresAt: new Date('2026-09-27T00:00:00Z'),
  acceptedAt: null,
  ...over,
});

describe('invite tokens', () => {
  it('generates long, unguessable, distinct tokens', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43); // 32 random bytes
  });

  it('stores a hash rather than the token', () => {
    const token = generateInviteToken();
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(hashInviteToken(token)).not.toContain(token);
  });
});

describe('isInviteUsable', () => {
  it('accepts a signup with the invited email, ignoring case and spaces', () => {
    expect(isInviteUsable(invite(), ' ben@solsaunas.com.au ', now)).toBe(true);
  });

  it('refuses a signup with any other email', () => {
    // Holding the link is not enough: the account must be for the invited person.
    expect(isInviteUsable(invite(), 'someone@else.com', now)).toBe(false);
  });

  it('refuses an expired invite', () => {
    expect(isInviteUsable(invite({ expiresAt: new Date('2026-09-12T00:00:00Z') }), 'ben@solsaunas.com.au', now)).toBe(false);
  });

  it('refuses an invite that has already been used', () => {
    expect(isInviteUsable(invite({ acceptedAt: new Date('2026-09-10T00:00:00Z') }), 'ben@solsaunas.com.au', now)).toBe(false);
  });

  it('refuses a missing invite', () => {
    expect(isInviteUsable(null, 'ben@solsaunas.com.au', now)).toBe(false);
  });
});

describe('reading the invite cookie', () => {
  it('finds it among other cookies', () => {
    expect(readCookie(`a=1; ${INVITE_COOKIE}=abc-123; b=2`, INVITE_COOKIE)).toBe('abc-123');
  });

  it('returns null when absent', () => {
    expect(readCookie('a=1; b=2', INVITE_COOKIE)).toBeNull();
    expect(readCookie(null, INVITE_COOKIE)).toBeNull();
  });

  it('does not match a cookie whose name merely ends the same', () => {
    expect(readCookie(`x${INVITE_COOKIE}=nope`, INVITE_COOKIE)).toBeNull();
  });

  it('reads the header from a request context, a Headers object or a plain object', () => {
    const header = `${INVITE_COOKIE}=t`;
    expect(cookieHeaderFrom({ request: new Request('http://x', { headers: { cookie: header } }) })).toBe(header);
    expect(cookieHeaderFrom({ headers: new Headers({ cookie: header }) })).toBe(header);
    expect(cookieHeaderFrom({ headers: { cookie: header } })).toBe(header);
  });

  it('copes with no context, as when a user is created outside a request', () => {
    expect(cookieHeaderFrom(null)).toBeNull();
  });
});

describe('looksLikeEmail', () => {
  it('accepts an address and rejects obvious typos', () => {
    expect(looksLikeEmail('ben@solsaunas.com.au')).toBe(true);
    expect(looksLikeEmail('ben@solsaunas')).toBe(false);
    expect(looksLikeEmail('ben solsaunas.com.au')).toBe(false);
  });
});

describe('buildInviteEmail', () => {
  it('carries the link, the address to sign up with and the expiry', () => {
    const email = buildInviteEmail({
      to: 'ben@solsaunas.com.au',
      link: 'https://app.example/signup?invite=t',
      invitedBy: 'Kyle',
      expiresAt: new Date('2026-09-27T00:00:00Z'),
    });
    expect(email.to).toEqual(['ben@solsaunas.com.au']);
    expect(email.text).toContain('https://app.example/signup?invite=t');
    expect(email.text).toContain('Use ben@solsaunas.com.au when you sign up');
    expect(email.text).toContain('Kyle');
  });
});
