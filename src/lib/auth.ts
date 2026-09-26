import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { pool } from './db';
import { isBootstrapAdmin } from './adminEmails';
import { resolveBaseURL, resolveTrustedOrigins } from './authOrigins';
import { buildAccessRequestNotice } from './accessRequestNotice';
import { sendEmail } from './email';
import { findUsableInvite, markInviteAccepted } from './invites';
import { INVITE_COOKIE, cookieHeaderFrom, readCookie } from './inviteTokens';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  database: pool,
  baseURL: resolveBaseURL(),
  trustedOrigins: resolveTrustedOrigins(),
  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    // New accounts are not approved yet, so there is nothing to sign in to.
    // Signup redirects to the pending page instead.
    autoSignIn: false,
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
        },
      }
    : {},

  account: {
    accountLinking: {
      // Google verifies email ownership, so linking a Google login onto an
      // existing email/password account of the same address is safe.
      enabled: true,
      trustedProviders: ['google'],
    },
  },

  user: {
    additionalFields: {
      approved: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        // Server-owned: a signup payload must never be able to set this.
        input: false,
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
      approvedAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the expiry once a day
    // No cookie cache: approval and revocation must take effect on the very
    // next request, which means reading the user row rather than a cached copy.
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          if (isBootstrapAdmin(user.email)) {
            return {
              data: { ...user, approved: true, role: 'admin', approvedAt: new Date() },
            };
          }
          // Someone signing up through an admin's invite link, with the address
          // it was issued for, is let straight in. See inviteTokens.ts.
          if (await matchingInvite(user.email, context)) {
            return { data: { ...user, approved: true, role: 'user', approvedAt: new Date() } };
          }
          return { data: { ...user, approved: false, role: 'user' } };
        },
        // Nothing else surfaces a pending request: no queue, no digest, no
        // badge. Without this the account sits in the database until an admin
        // happens to open /admin/users.
        after: async (user, context) => {
          // Approved on creation (an admin, or an invite), so there is nothing to
          // act on and nobody to tell. An invite that did the approving is used
          // up here so its link cannot let anyone else in.
          if (user.approved === true) {
            const invite = await matchingInvite(user.email, context);
            if (invite) await markInviteAccepted(invite.id, user.id).catch(() => {});
            return;
          }

          const notice = buildAccessRequestNotice({ name: user.name, email: user.email });
          if (!notice) return;

          // sendEmail never throws and never rejects. Signup has already
          // succeeded by this point and must not be undone by a mail failure.
          await sendEmail(notice);
        },
      },
    },
  },

  // Must stay last: it forwards Set-Cookie headers out of server actions.
  plugins: [nextCookies()],
});

export const isGoogleAuthEnabled = googleEnabled;

/**
 * The invite the signup request is carrying, if it is still valid for this
 * address. Never throws: a database hiccup must not break signup, it just means
 * the person lands in the approval queue as they would without an invite.
 */
async function matchingInvite(email: string, context: unknown) {
  const token = readCookie(cookieHeaderFrom(context), INVITE_COOKIE);
  if (!token) return null;
  try {
    return await findUsableInvite(token, email);
  } catch (error) {
    console.error('[auth] invite lookup failed, falling back to manual approval', error);
    return null;
  }
}

export type AuthSession = typeof auth.$Infer.Session;
