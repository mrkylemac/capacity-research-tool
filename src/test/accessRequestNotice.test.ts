import { buildAccessRequestNotice, noticeRecipients } from '@/lib/accessRequestNotice';

const ADMINS = 'kyle@slowfolk.au, ops@slowfolk.au';

describe('noticeRecipients', () => {
  it('tells every admin in the list', () => {
    expect(noticeRecipients({ name: 'Sam', email: 'sam@example.com' }, ADMINS))
      .toEqual(['kyle@slowfolk.au', 'ops@slowfolk.au']);
  });

  // An admin's own signup is approved on creation, so mailing them about it
  // would be noise about an account that needs no action.
  it('does not mail an admin about their own signup', () => {
    expect(noticeRecipients({ name: 'Kyle', email: 'KYLE@slowfolk.au' }, ADMINS))
      .toEqual(['ops@slowfolk.au']);
  });

  it('is empty when no admins are configured', () => {
    expect(noticeRecipients({ name: 'Sam', email: 'sam@example.com' }, undefined)).toEqual([]);
    expect(noticeRecipients({ name: 'Sam', email: 'sam@example.com' }, '')).toEqual([]);
  });
});

describe('buildAccessRequestNotice', () => {
  const request = { name: 'Sam Doe', email: 'sam@example.com' };

  it('names the requester in the subject so the inbox is scannable', () => {
    const notice = buildAccessRequestNotice(request, {
      appUrl: 'https://capacity-reporter.vercel.app',
      adminEmails: ADMINS,
    });

    expect(notice?.subject).toBe('Access request: sam@example.com');
    expect(notice?.to).toEqual(['kyle@slowfolk.au', 'ops@slowfolk.au']);
  });

  it('links straight to the approval page', () => {
    const notice = buildAccessRequestNotice(request, {
      appUrl: 'https://capacity-reporter.vercel.app',
      adminEmails: ADMINS,
    });

    expect(notice?.text).toContain('https://capacity-reporter.vercel.app/admin/users');
    expect(notice?.text).toContain('Sam Doe');
    expect(notice?.text).toContain('sam@example.com');
  });

  it('does not produce a double slash when the app URL has a trailing one', () => {
    const notice = buildAccessRequestNotice(request, {
      appUrl: 'https://capacity-reporter.vercel.app/',
      adminEmails: ADMINS,
    });

    expect(notice?.text).toContain('https://capacity-reporter.vercel.app/admin/users');
    expect(notice?.text).not.toContain('.app//admin');
  });

  it('falls back to a relative link when no app URL is configured', () => {
    const notice = buildAccessRequestNotice(request, { appUrl: '', adminEmails: ADMINS });
    expect(notice?.text).toContain('/admin/users');
  });

  it('handles a missing name without printing null', () => {
    const notice = buildAccessRequestNotice(
      { name: null, email: 'sam@example.com' },
      { appUrl: 'https://x.example', adminEmails: ADMINS },
    );

    expect(notice?.text).toContain('Someone has requested access');
    expect(notice?.text).not.toContain('null');
  });

  // No admins means nobody could act on it, so there is no email to send and
  // the caller should not be handed an empty envelope.
  it('returns null when there is nobody to tell', () => {
    expect(buildAccessRequestNotice(request, { appUrl: 'https://x.example', adminEmails: '' }))
      .toBeNull();
  });
});
