/**
 * The email an admin gets when somebody requests access.
 *
 * Nothing else tells you a request came in: there is no queue, no digest and no
 * badge, so an unapproved account sits in the database until an admin happens
 * to open /admin/users. This is that missing signal.
 *
 * The body building and recipient choice live here, apart from the transport,
 * so both can be tested without a network call or an API key.
 */
import { parseAdminEmails } from './adminEmails';

export interface AccessRequest {
  name: string | null;
  email: string;
}

export interface AccessRequestNotice {
  to: string[];
  subject: string;
  text: string;
}

/**
 * Who to tell. The same `ADMIN_EMAILS` list that decides who is auto-approved,
 * since those are exactly the people who can act on the request.
 *
 * The requester is dropped from the list. An admin signing up would otherwise
 * email themselves about their own account, and their account is approved on
 * creation anyway, so there is nothing to act on.
 */
export function noticeRecipients(
  request: AccessRequest,
  raw = process.env.ADMIN_EMAILS,
): string[] {
  const requester = request.email.trim().toLowerCase();
  return parseAdminEmails(raw).filter(admin => admin !== requester);
}

/**
 * Plain text only. This goes to a handful of admins, it carries one fact and
 * one link, and plain text renders the same everywhere without a template.
 */
export function buildAccessRequestNotice(
  request: AccessRequest,
  options: { appUrl?: string; adminEmails?: string } = {},
): AccessRequestNotice | null {
  const to = noticeRecipients(request, options.adminEmails ?? process.env.ADMIN_EMAILS);
  if (to.length === 0) return null;

  const name = request.name?.trim() || 'Someone';
  const base = (options.appUrl ?? process.env.BETTER_AUTH_URL ?? '').replace(/\/+$/, '');
  const link = base ? `${base}/admin/users` : '/admin/users';

  return {
    to,
    subject: `Access request: ${request.email}`,
    text: [
      `${name} has requested access to the Slow Folk capacity tool.`,
      '',
      `Name:  ${name}`,
      `Email: ${request.email}`,
      '',
      'They cannot see anything until you approve them:',
      link,
    ].join('\n'),
  };
}
