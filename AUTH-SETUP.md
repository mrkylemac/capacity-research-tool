# Authentication setup

The app is behind a login. Anyone can request an account, but nobody sees any
data until an admin approves them by hand.

- **Library:** [Better Auth](https://better-auth.com) with email + password and
  optional Google sign-in
- **Database:** Postgres (Fly Managed Postgres)
- **Hosting:** Fly.io — the app and the database share a private network, which
  is the only way to reach Managed Postgres (it has no public endpoint)

## How approval works

| Step | What happens |
|------|--------------|
| Someone signs up | A `user` row is created with `approved = false`. No session is issued. |
| They try to sign in | Sign-in succeeds, but every page redirects to `/pending` and every API route returns `403`. |
| An admin approves them at `/admin/users` | `approved` flips to `true`. |
| They reload | Full access. No need to sign out and back in. |
| An admin revokes them | Access stops on the next request and their sessions are deleted. |

`approved` and `role` are server-owned (`input: false`), so a crafted signup
payload cannot grant itself access. Every protected page calls
`requireApprovedUser()` and every protected route handler calls
`requireApprovedUserForApi()` — the middleware only does a cheap cookie check
and is not the security boundary.

### The first admin

Approval has a chicken-and-egg problem. Any address listed in `ADMIN_EMAILS`
(comma separated) is auto-approved and made admin the moment it signs up. Set it
to your own address, sign up once, and approve everyone else from `/admin/users`.

## One-time setup

### 1. Create the database

```bash
fly mpg create --name slowfolk-db --region syd
```

Grab the **pooled** connection string from the cluster's Connect tab in the Fly
dashboard. SSL is on by default; no `sslmode` needed.

### 2. Create the app

```bash
fly launch --no-deploy          # reads the committed fly.toml
fly mpg attach <cluster-id> --app slowfolk-sauna-house
```

`mpg attach` sets `DATABASE_URL` on the app for you.

### 3. Set the remaining secrets

```bash
fly secrets set \
  BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  BETTER_AUTH_URL="https://slowfolk-sauna-house.fly.dev" \
  ADMIN_EMAILS="you@example.com"
```

Add `GOOGLE_SHEETS_API_KEY` and `GOOGLE_SHEETS_SPREADSHEET_ID` too if you use
the CapEx tracker.

### 4. Create the tables

```bash
fly mpg connect --cluster <cluster-id>     # opens psql over the private network
\i src/db/auth-schema.sql
```

Or from your machine with a proxy open:

```bash
fly mpg proxy --cluster <cluster-id> &
psql "postgresql://fly-user:PASSWORD@localhost:5432/fly-db" -f src/db/auth-schema.sql
```

### 5. Deploy

```bash
fly deploy
```

Then visit `/signup`, register with the address in `ADMIN_EMAILS`, and you are in
as an approved admin.

### 6. Automate deploys

Venue polling commits new session data every 30 minutes, and that data is baked
into the image — so a commit without a deploy changes nothing in production.
`.github/workflows/deploy.yml` handles this, but it needs a token:

```bash
fly tokens create deploy -x 999999h
```

Add the output as a repository secret named `FLY_API_TOKEN`.

Both `poll-venues.yml` and `refresh-glofox-tokens.yml` call the deploy workflow
after a successful commit. Their commits carry `[skip ci]`, which suppresses the
ordinary push trigger, so the explicit call is what keeps production current.

### 7. Turn off the Vercel deployment

The project used to deploy to Vercel. Disconnect the Git integration in the
Vercel dashboard so two copies of the app are not serving at once — the Vercel
one has no route to the database and will fail every request.

## Google sign-in (optional)

Leave `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` unset and the login page shows
email and password only. To enable it:

1. In Google Cloud Console create an OAuth 2.0 Client ID (Web application).
2. Add the authorised redirect URI:
   `https://slowfolk-sauna-house.fly.dev/api/auth/callback/google`
   (and `http://localhost:3000/api/auth/callback/google` for local work).
3. `fly secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...`

Google accounts go through the same approval queue. Signing in with Google links
to an existing email/password account of the same address, since Google verifies
email ownership.

## Local development

```bash
# Any local Postgres will do.
createdb slowfolk
psql slowfolk -f src/db/auth-schema.sql
```

Put this in `.env.local`:

```
DATABASE_URL=postgresql://localhost:5432/slowfolk
BETTER_AUTH_SECRET=any-long-random-string-at-least-32-chars
BETTER_AUTH_URL=http://localhost:3000
ADMIN_EMAILS=you@example.com
```

Use `.env.local`, not `.env` — `.env` is tracked in this repository (see the
warning below), so anything you put there is committed.

```bash
yarn dev
```

## Managing users

`/admin/users` lists pending accounts first, then approved ones. Admins can
approve, revoke, and see when each person signed up. You cannot revoke your own
access — that guard exists so the last admin cannot lock everyone out.

To promote someone else to admin, do it in SQL:

```sql
UPDATE "user" SET "role" = 'admin' WHERE email = 'them@example.com';
```

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | Postgres connection string. Set by `fly mpg attach`. |
| `BETTER_AUTH_SECRET` | yes | Signs session cookies. `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | yes in production | Public URL of the app. |
| `ADMIN_EMAILS` | yes for the first admin | Comma-separated auto-approved admins. |
| `GOOGLE_CLIENT_ID` | no | Enables Google sign-in when set with the secret. |
| `GOOGLE_CLIENT_SECRET` | no | As above. |

## Security note about this repository

`.env` is listed in `.gitignore` but was committed before that rule existed, so
git still tracks it and it currently holds a `GOOGLE_COOKIE` value. Anything
added to it gets pushed. Worth fixing separately:

```bash
git rm --cached .env
git commit -m "chore: stop tracking .env"
```

Treat any credential already committed there as exposed and rotate it. Note that
untracking does not remove it from existing history.

## Schema changes

The schema lives in `src/db/auth-schema.sql`, generated from `src/lib/auth.ts`.
After changing `user.additionalFields`, run `yarn auth:generate` to refresh the
file and `yarn auth:migrate` to apply the difference to a live database. Both
need a reachable database — see `src/db/README.md`.
