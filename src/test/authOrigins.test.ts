import { resolveBaseURL, resolveTrustedOrigins, toOrigin } from '@/lib/authOrigins';

describe('toOrigin', () => {
  it('adds https to a bare Vercel hostname', () => {
    expect(toOrigin('capacity-reporter.vercel.app')).toBe('https://capacity-reporter.vercel.app');
  });

  it('strips a trailing slash and any path', () => {
    expect(toOrigin('https://capacity-reporter.vercel.app/')).toBe('https://capacity-reporter.vercel.app');
    expect(toOrigin('https://capacity-reporter.vercel.app/login')).toBe('https://capacity-reporter.vercel.app');
  });

  it('returns undefined for empty or unparseable input', () => {
    expect(toOrigin(undefined)).toBeUndefined();
    expect(toOrigin('')).toBeUndefined();
    expect(toOrigin('http://')).toBeUndefined();
  });
});

describe('resolveBaseURL', () => {
  it('prefers BETTER_AUTH_URL', () => {
    expect(resolveBaseURL({ BETTER_AUTH_URL: 'https://a.example', VERCEL_URL: 'b.example' } as NodeJS.ProcessEnv))
      .toBe('https://a.example');
  });

  it('trims a trailing slash, which Better Auth compares literally', () => {
    expect(resolveBaseURL({ BETTER_AUTH_URL: 'https://a.example/' } as NodeJS.ProcessEnv)).toBe('https://a.example');
  });

  it('falls back to the deployment host', () => {
    expect(resolveBaseURL({ VERCEL_URL: 'b.example' } as NodeJS.ProcessEnv)).toBe('https://b.example');
  });

  it('returns undefined when neither is set', () => {
    expect(resolveBaseURL({} as NodeJS.ProcessEnv)).toBeUndefined();
  });
});

describe('resolveTrustedOrigins', () => {
  // The failure this guards against: BETTER_AUTH_URL was set to the Vercel
  // project name while the app is served from a differently named domain, so
  // every signup came back "Invalid origin".
  it('trusts the production domain even when BETTER_AUTH_URL names another host', () => {
    const origins = resolveTrustedOrigins({
      BETTER_AUTH_URL: 'https://capacity-research-tool.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'capacity-reporter.vercel.app',
    } as NodeJS.ProcessEnv);

    expect(origins).toContain('https://capacity-reporter.vercel.app');
    expect(origins).toContain('https://capacity-research-tool.vercel.app');
  });

  it('trusts the per-branch and per-deployment hosts a preview is opened on', () => {
    const origins = resolveTrustedOrigins({
      VERCEL_PROJECT_PRODUCTION_URL: 'capacity-reporter.vercel.app',
      VERCEL_BRANCH_URL: 'capacity-reporter-git-main-team.vercel.app',
      VERCEL_URL: 'capacity-reporter-abc123-team.vercel.app',
    } as NodeJS.ProcessEnv);

    expect(origins).toEqual([
      'https://capacity-reporter.vercel.app',
      'https://capacity-reporter-git-main-team.vercel.app',
      'https://capacity-reporter-abc123-team.vercel.app',
    ]);
  });

  it('deduplicates when the variables name the same host', () => {
    expect(resolveTrustedOrigins({
      BETTER_AUTH_URL: 'https://capacity-reporter.vercel.app/',
      VERCEL_PROJECT_PRODUCTION_URL: 'capacity-reporter.vercel.app',
    } as NodeJS.ProcessEnv)).toEqual(['https://capacity-reporter.vercel.app']);
  });

  it('is empty when nothing is configured, leaving the Better Auth default alone', () => {
    expect(resolveTrustedOrigins({} as NodeJS.ProcessEnv)).toEqual([]);
  });
});
