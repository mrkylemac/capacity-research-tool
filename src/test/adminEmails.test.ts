import { parseAdminEmails, isBootstrapAdmin } from '@/lib/adminEmails';

describe('parseAdminEmails', () => {
  it('returns an empty list when unset', () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails('')).toEqual([]);
  });

  it('splits, trims and lowercases', () => {
    expect(parseAdminEmails(' Kyle@Example.com , second@example.com ')).toEqual([
      'kyle@example.com',
      'second@example.com',
    ]);
  });

  it('drops empty entries from trailing or doubled commas', () => {
    expect(parseAdminEmails('a@example.com,,b@example.com,')).toEqual([
      'a@example.com',
      'b@example.com',
    ]);
  });
});

describe('isBootstrapAdmin', () => {
  const admins = 'kyle@example.com,ops@example.com';

  it('matches regardless of case or surrounding whitespace', () => {
    expect(isBootstrapAdmin('KYLE@example.com', admins)).toBe(true);
    expect(isBootstrapAdmin('  ops@example.com  ', admins)).toBe(true);
  });

  it('rejects addresses that are not listed', () => {
    expect(isBootstrapAdmin('stranger@example.com', admins)).toBe(false);
  });

  it('rejects everything when no admins are configured', () => {
    expect(isBootstrapAdmin('kyle@example.com', undefined)).toBe(false);
    expect(isBootstrapAdmin('kyle@example.com', '')).toBe(false);
  });

  it('rejects an empty email even when admins are configured', () => {
    expect(isBootstrapAdmin('', admins)).toBe(false);
  });

  it('does not match on a substring', () => {
    expect(isBootstrapAdmin('notkyle@example.com', admins)).toBe(false);
    expect(isBootstrapAdmin('kyle@example.com.attacker.test', admins)).toBe(false);
  });
});
