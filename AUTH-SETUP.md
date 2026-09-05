# Authentication setup

The app is behind a login. Anyone can request an account, but nobody sees any
data until an admin approves them by hand.

- **Library:** [Better Auth](https://better-auth.com) with email and password,
  plus optional Google sign-in
- **Database:** any Postgres. Neon is the default because its Vercel
  integration wires everything up from the dashboard.
- **Hosting:** Vercel, unchanged

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
`requireApprovedUserForApi()`. The middleware only does a cheap cookie check and
is not the security boundary.

### The first admin

Approval has a chicken-and-egg problem. Any address listed in `ADMIN_EMAILS`
(comma separated) is auto-approved and made admin the moment it signs up. Set it
to your own address, sign up once, and approve everyone else from `/admin/users`.

## Setup

All of this is done in a browser.

### 1. Add Neon to the Vercel project

In the Vercel dashboard, open the project, go to the Storage tab, and add
**Neon** from the Marketplace. Pick a region close to your users.

The integration sets the connection environment variables for you, across
Production, Preview and Development. The one that matters is `DATABASE_URL`,
which points at Neon's pooled PgBouncer endpoint. That is the right one for
serverless functions, which open a connection per instance.

### 2. Add the remaining environment variables

Still in the Vercel dashboard, under Settings then Environment Variables:

| Variable | Value |
|----------|-------|
| `BETTER_AUTH_SECRET` | A long random string. Generate one at any password generator, at least 32 characters. |
| `BETTER_AUTH_URL` | The production URL of the app, for example `https://capacity-research-tool.vercel.app` |
| `ADMIN_EMAILS` | Your email address |

`BETTER_AUTH_SECRET` signs session cookies. Changing it later signs everyone
out, so set it once and leave it.

### 2b. Optional: get told when someone requests access

Nothing else surfaces a pending request. Without this an unapproved account
sits in the database until an admin opens `/admin/users`.

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | A key from [resend.com/api-keys](https://resend.com/api-keys) |
| `EMAIL_FROM` | Sender address. Optional. |

Leave `RESEND_API_KEY` unset and signup still works: the send is skipped and
logged, and no failure reaches the person signing up. A rejected or failed send
is swallowed the same way, since the account has already been created by then.

`EMAIL_FROM` defaults to Resend's shared `onboarding@resend.dev`, which needs no
DNS setup but only delivers to the address that owns the Resend account. To mail
anyone else, verify a domain in Resend and set this to an address on it.

The email goes to every address in `ADMIN_EMAILS`, minus the requester, and
links to `/admin/users`.

### 3. Create the tables

Open the Neon console, go to the SQL Editor, paste the contents of
`src/db/auth-schema.sql`, and run it. That creates four tables: `user`,
`session`, `account` and `verification`.

### 4. Merge the pull request

Vercel deploys on push, as it always has.

### 5. Sign up

Visit `/signup` and register with the address you put in `ADMIN_EMAILS`. You
come out approved and admin. Everyone else who signs up waits in the queue at
`/admin/users`.

## Google sign-in (optional)

Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` unset and the login page
shows email and password only. To enable it:

1. In Google Cloud Console create an OAuth 2.0 Client ID (Web application).
2. Add the authorised redirect URI:
   `https://YOUR-DOMAIN/api/auth/callback/google`
   and `http://localhost:3000/api/auth/callback/google` for local work.
3. Add both values as Vercel environment variables.

Google accounts go through the same approval queue. Signing in with Google links
to an existing email and password account of the same address, since Google
verifies email ownership.

## Local development

Any local Postgres will do:

```bash
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

Use `.env.local`, not `.env`. `.env` is tracked in this repository (see the
warning below), so anything you put there is committed.

```bash
yarn dev
```

You can also point `DATABASE_URL` at your Neon database and skip local Postgres
entirely. Use the unpooled connection string for that.

## Managing users

`/admin/users` lists pending accounts first, then approved ones. Admins can
approve, revoke, and see when each person signed up. You cannot revoke your own
access. That guard exists so the last admin cannot lock everyone out.

To promote someone else to admin, do it in SQL:

```sql
UPDATE "user" SET "role" = 'admin' WHERE email = 'them@example.com';
```

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | Postgres connection string. Set by the Neon integration. |
| `BETTER_AUTH_SECRET` | yes | Signs session cookies. |
| `BETTER_AUTH_URL` | yes in production | Public URL of the app. Inferred from `VERCEL_URL` if unset, which is wrong for a custom domain. |
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
need a reachable database, which with Neon means pointing `DATABASE_URL` at it
locally. See `src/db/README.md`.
