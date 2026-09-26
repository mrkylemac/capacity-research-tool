/**
 * The email that carries an invite link. Built apart from the transport so it
 * can be tested without a network call.
 */
import type { EmailMessage } from './email';

export interface InviteEmailInput {
  to: string;
  link: string;
  invitedBy: string | null;
  expiresAt: Date;
}

export function buildInviteEmail({ to, link, invitedBy, expiresAt }: InviteEmailInput): EmailMessage {
  const expires = expiresAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  return {
    to: [to],
    subject: "You've been invited to the Slow Folk capacity tool",
    text: [
      `${invitedBy?.trim() || 'Slow Folk'} has given you access to the Slow Folk capacity tool.`,
      '',
      'Create your account with this link and you will be let straight in:',
      link,
      '',
      `Use ${to} when you sign up. The link works once and expires on ${expires}.`,
    ].join('\n'),
  };
}
