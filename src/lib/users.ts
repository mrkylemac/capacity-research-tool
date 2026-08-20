import 'server-only';

import { pool } from './db';

/**
 * Direct queries against the Better Auth `user` table.
 *
 * Better Auth owns the schema and creates camelCase columns, which Postgres
 * only preserves when quoted — hence the double quotes throughout.
 */
export interface ManagedUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  approved: boolean;
  role: string;
  createdAt: Date;
  approvedAt: Date | null;
}

const USER_COLUMNS = `id, name, email, image, "approved", "role", "createdAt", "approvedAt"`;

export async function listUsers(): Promise<ManagedUser[]> {
  const { rows } = await pool.query<ManagedUser>(
    // Pending accounts first, then newest signups — the review queue reads
    // top-down without any filtering.
    `SELECT ${USER_COLUMNS} FROM "user" ORDER BY "approved" ASC, "createdAt" DESC`,
  );
  return rows.map(row => ({ ...row, approved: row.approved === true }));
}

export async function setUserApproval(userId: string, approved: boolean): Promise<ManagedUser | null> {
  const { rows } = await pool.query<ManagedUser>(
    `UPDATE "user"
        SET "approved" = $2,
            "approvedAt" = CASE WHEN $2 THEN NOW() ELSE NULL END,
            "updatedAt" = NOW()
      WHERE id = $1
      RETURNING ${USER_COLUMNS}`,
    [userId, approved],
  );

  if (rows.length === 0) return null;

  // Revoking should boot the user immediately rather than waiting for their
  // session to lapse. Approval checks already read the live row, so this is
  // belt and braces — it also frees the session row.
  if (!approved) {
    await pool.query(`DELETE FROM "session" WHERE "userId" = $1`, [userId]);
  }

  return { ...rows[0], approved: rows[0].approved === true };
}

export async function countPendingUsers(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "user" WHERE "approved" IS NOT TRUE`,
  );
  return Number(rows[0]?.count ?? 0);
}
