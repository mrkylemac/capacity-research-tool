# Poll dispatcher

A Cloudflare Worker that triggers the `poll-venues.yml` GitHub Actions workflow
every 15 minutes.

## Why it exists

GitHub runs scheduled workflows on a best effort basis and drops runs when it is
busy. Against a 15 minute cron it delivered 36 runs a day at its best and 6 a day
by September 2026, against 96 scheduled. For Navia that meant the last reading of
a sitting was often taken one to four hours before it started, so late bookings
were never recorded.

Runs started through the GitHub API are not throttled. This worker fires on
Cloudflare's cron, which is reliable, and asks GitHub to run the workflow. The
workflow's own time gates still decide which venues actually get polled.

The workflow's `schedule` trigger stays in place as a fallback, so if this worker
stops, polling degrades to what GitHub delivers rather than stopping.

## Setup

**Order matters.** The workflow change that adds the `force` input must be on
`main` before this worker is deployed. Without it, every dispatch polls every
venue and runs both deep refreshes, every 15 minutes.

### 1. Create a GitHub token

GitHub, Settings, Developer settings, Personal access tokens, **Fine grained
tokens**, Generate new token.

- **Repository access:** Only select repositories, `capacity-research-tool`
- **Permissions:** Repository permissions, **Actions: Read and write**. Nothing
  else. Metadata read access is added automatically.
- **Expiration:** the longest your account allows. Put a reminder in the calendar
  a week before it expires, because the worker fails silently from GitHub's side
  once it does (it shows as failed invocations in Cloudflare).

Actions write lets the token start, cancel and re run workflows in this one
repository. It cannot read or change code.

### 2. Deploy

```bash
cd workers/poll-dispatcher
npx wrangler@latest login
npx wrangler@latest deploy
npx wrangler@latest secret put GITHUB_TOKEN
```

Paste the token when prompted. Deploying before adding the secret is fine: any
cron that fires in between fails harmlessly with a clear message.

### 3. Check it is working

After the next quarter hour:

```bash
gh run list --workflow=poll-venues.yml --limit 5
```

New runs show the event `workflow_dispatch`. In Cloudflare, Workers and Pages,
`slowfolk-poll-dispatcher`, the Logs tab shows each invocation.

To watch invocations live:

```bash
npx wrangler@latest tail
```

## Changing it

Repository, workflow file and branch are plain vars in `wrangler.jsonc`. The
token is a secret and never goes in that file. Redeploy after any change.

To force a full refresh by hand, use Run workflow on the Actions tab and tick
**force**. The worker never does this.
