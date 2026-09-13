import 'server-only';

import { pool } from './db';
import {
  INVITE_TTL_DAYS,
  generateInviteToken,
  hashInviteToken,
  isInviteUsable,
  normaliseEmail,
  type InviteRecord,
} from './inviteTokens';

/**
 * Invites: admin-issued links that approve one named person on signup.
 * See inviteTokens.ts for why an invite is a link rather than an allowlisted
 * address.
 *
 * The table lives outside Better Auth's schema (`yarn auth:generate` would drop
 * it from auth-schema.sql), so it is created here on first use instead of by a
 * migration step someone has to remember to run.
 */

export interface InviteRow extends InviteRecord {
  invitedBy: string | null;
  createdAt: Date;
}

let tableReady: Promise<void> | null = null;

function ensureInviteTable(): Promise<void> {
  tableReady ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS "access_invite" (
         "id"             text PRIMARY KEY,
         "email"          text NOT NULL,
         "tokenHash"      text NOT NULL UNIQUE,
         "invitedBy"      text REFERENCES "user" ("id") ON DELETE SET NULL,
         "createdAt"      timestamptz NOT NULL DEFAULT NOW(),
         "expiresAt"      timestamptz NOT NULL,
         "acceptedAt"     timestamptz,
         "acceptedUserId" text REFERENCES "user" ("id") ON DELETE SET NULL
       );
       CREATE INDEX IF NOT EXISTS "access_invite_email_idx" ON "access_invite" (lower("email"));`,
    )
    .then(() => undefined)
    .catch(error => {
      // Let the next call retry rather than caching a failure forever.
      tableReady = null;
      throw error;
    });
  return tableReady;
}

const INVITE_COLUMNS = `"id", "email", "invitedBy", "createdAt", "expiresAt", "acceptedAt"`;

/**
 * Issue a fresh link for `email`. Any earlier unused link for the same address
 * stops working, so only the most recent one you sent is live.
 */
export async function createInvite(email: string, invitedBy: string): Promise<{ token: string; invite: InviteRow }> {
  await ensureInviteTable();
  const address = normaliseEmail(email);
  const token = generateInviteToken();
  const id = generateInviteToken().slice(0, 21);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM "access_invite" WHERE lower("email") = $1 AND "acceptedAt" IS NULL`,
      [address],
    );
    const { rows } = await client.query<InviteRow>(
      `INSERT INTO "access_invite" ("id", "email", "tokenHash", "invitedBy", "expiresAt")
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' days')::interval)
       RETURNING ${INVITE_COLUMNS}`,
      [id, address, hashInviteToken(token), invitedBy, String(INVITE_TTL_DAYS)],
    );
    await client.query('COMMIT');
    return { token, invite: rows[0] };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** The invite behind a token, if it can still approve a signup for `email`. */
export async function findUsableInvite(token: string, email: string): Promise<InviteRow | null> {
  await ensureInviteTable();
  const { rows } = await pool.query<InviteRow>(
    `SELECT ${INVITE_COLUMNS} FROM "access_invite" WHERE "tokenHash" = $1`,
    [hashInviteToken(token)],
  );
  const invite = rows[0] ?? null;
  return isInviteUsable(invite, email) ? invite : null;
}

/** The invite behind a token, for showing who it is for before signup. */
export async function lookupInvite(token: string): Promise<InviteRow | null> {
  await ensureInviteTable();
  const { rows } = await pool.query<InviteRow>(
    `SELECT ${INVITE_COLUMNS} FROM "access_invite" WHERE "tokenHash" = $1`,
    [hashInviteToken(token)],
  );
  const invite = rows[0] ?? null;
  return invite && isInviteUsable(invite, invite.email) ? invite : null;
}

/** Mark an invite used so its link cannot approve anyone else. */
export async function markInviteAccepted(inviteId: string, userId: string): Promise<void> {
  await ensureInviteTable();
  await pool.query(
    `UPDATE "access_invite" SET "acceptedAt" = NOW(), "acceptedUserId" = $2
      WHERE "id" = $1 AND "acceptedAt" IS NULL`,
    [inviteId, userId],
  );
}

/** Invites not yet used and not yet expired, newest first. */
export async function listOpenInvites(): Promise<InviteRow[]> {
  await ensureInviteTable();
  const { rows } = await pool.query<InviteRow>(
    `SELECT ${INVITE_COLUMNS} FROM "access_invite"
      WHERE "acceptedAt" IS NULL AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC`,
  );
  return rows;
}

export async function revokeInvite(inviteId: string): Promise<boolean> {
  await ensureInviteTable();
  const { rowCount } = await pool.query(
    `DELETE FROM "access_invite" WHERE "id" = $1 AND "acceptedAt" IS NULL`,
    [inviteId],
  );
  return (rowCount ?? 0) > 0;
}
