/**
 * Creates the Better Auth tables if they are missing.
 *
 * Runs as the Fly `release_command`, which executes on a temporary Machine
 * inside the app's private network with the app's secrets attached. That is the
 * only place a migration can reach Fly Managed Postgres, since the cluster has
 * no public endpoint — a GitHub Actions runner cannot connect to it.
 *
 * Deliberately conservative: it creates the schema on an empty database and
 * does nothing otherwise. Adding or changing columns later is a job for
 * `yarn auth:migrate`, which diffs the live database properly.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const SCHEMA_PATH = path.join(process.cwd(), 'src', 'db', 'auth-schema.sql');

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('[migrate] DATABASE_URL is not set. Attach the database first.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
  } catch (error) {
    // A stack trace in the Fly deploy log helps nobody; say what went wrong.
    console.error(`[migrate] Could not reach the database: ${error.message}`);
    process.exit(1);
  }

  try {
    const { rows } = await client.query(`SELECT to_regclass('public."user"') AS table`);

    if (rows[0]?.table) {
      console.log('[migrate] Auth tables already present, nothing to do.');
      return;
    }

    const sql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    console.log('[migrate] Empty database — creating auth tables.');

    // One transaction: a partial schema is worse than no schema.
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('[migrate] Done.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[migrate] Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
