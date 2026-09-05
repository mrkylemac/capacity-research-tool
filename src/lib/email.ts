import 'server-only';

import { Resend } from 'resend';

/**
 * Outbound email, via Resend.
 *
 * Two rules hold everywhere this is used:
 *
 * 1. Missing configuration is not an error. Local dev and preview deployments
 *    run without `RESEND_API_KEY`, and a signup must not fail because of it.
 *    Unconfigured sends log once and return `skipped`.
 * 2. A failed send is not an error either. Every caller here is a notification
 *    about something that already happened, so losing the email is worse than
 *    nothing but far better than failing the action that triggered it.
 *
 * The caller therefore never needs a try/catch: `sendEmail` resolves either way
 * and reports what happened.
 */

export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
}

export type EmailResult =
  | { status: 'sent'; id: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

/**
 * Resend's shared sender. It works with no DNS setup, which is what makes this
 * usable before slowfolk.au is verified, but it can only deliver to the address
 * that owns the Resend account. Set EMAIL_FROM to an address on a verified
 * domain to reach anyone else.
 */
const DEFAULT_FROM = 'onboarding@resend.dev';

let client: Resend | null = null;

function getClient(apiKey: string): Resend {
  if (!client) client = new Resend(apiKey);
  return client;
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY is not set — skipping:', message.subject);
    return { status: 'skipped', reason: 'RESEND_API_KEY is not set' };
  }

  if (message.to.length === 0) {
    return { status: 'skipped', reason: 'no recipients' };
  }

  try {
    const { data, error } = await getClient(apiKey).emails.send({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });

    if (error) {
      console.error('[email] Resend rejected the send:', error.message);
      return { status: 'failed', reason: error.message };
    }

    return { status: 'sent', id: data?.id ?? null };
  } catch (cause) {
    // Network failure, timeout, a malformed key. Never rethrow: see rule 2.
    const reason = cause instanceof Error ? cause.message : String(cause);
    console.error('[email] send threw:', reason);
    return { status: 'failed', reason };
  }
}
