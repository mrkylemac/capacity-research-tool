# Database schema

`auth-schema.sql` is the Better Auth schema for this app, generated from
`src/lib/auth.ts`. It creates four tables — `user`, `session`, `account` and
`verification` — plus the `approved`, `role` and `approvedAt` columns that drive
manual approval.

## Applying it

Against a fresh database:

```bash
psql "$DATABASE_URL" -f src/db/auth-schema.sql
```

Or let the Better Auth CLI diff the live database and apply what is missing:

```bash
yarn auth:migrate
```

## Regenerating after an auth config change

Adding or removing a field in `user.additionalFields` changes the schema. To
refresh this file you need a reachable database for the CLI to introspect:

```bash
yarn auth:generate
```

Note that the CLI emits the *full* schema rather than an incremental migration,
so on an existing database use `yarn auth:migrate` to apply the difference.

## Column naming

Better Auth uses camelCase column names, which Postgres only preserves when
they are quoted. Any hand-written SQL against these tables needs double quotes
around `"createdAt"`, `"userId"`, `"approvedAt"` and friends — see
`src/lib/users.ts`.
