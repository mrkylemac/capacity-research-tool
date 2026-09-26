/**
 * Bootstrap admins.
 *
 * Approval has a chicken-and-egg problem: somebody has to approve the first
 * user. Any email listed in the `ADMIN_EMAILS` env var (comma separated) is
 * auto-approved and given the `admin` role the moment it signs up, so the
 * owner can get in and approve everyone else.
 */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isBootstrapAdmin(email: string, raw = process.env.ADMIN_EMAILS): boolean {
  if (!email) return false;
  return parseAdminEmails(raw).includes(email.trim().toLowerCase());
}
