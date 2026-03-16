# Slow Folk Booking Platform — Architecture Plan

> Replaces Momence with a custom booking system + KISI door access integration.
> Standalone repo: `slow-folk-booking` (separate from `sauna-session-stats`).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Multi-tenancy | Multi-venue ready (`venueId` on all tables) | Minimal upfront cost, avoids painful migration later |
| Auth | Clerk | Pre-built UI, passkeys, webhook sync to DB. Fastest to ship. |
| Database | Neon (serverless Postgres) | Scale-to-zero, branching, great Drizzle integration |
| ORM | Drizzle ORM | 5M+ weekly downloads, serverless-optimized, SQL-familiar, ~7kb |
| Background jobs | Inngest | Step functions, auto-retries, no worker infra. 50k free runs/mo |
| Payments | Stripe | Subscriptions, Checkout, Customer Portal, webhooks |
| Access control | KISI REST API (custom client) | `group_links` for time-bound access, webhooks for attendance |
| Email | Resend + React Email | React-native templates, simple API |
| Recurrence | Custom JSON pattern (not iCal RRULE) | Simpler for sauna sessions, materialized into concrete rows |
| Concurrency | Pessimistic locking (`SELECT FOR UPDATE`) | Double-booking is catastrophic in physical venues |
| Real-time | Postgres only (no Redis at MVP) | ~10 concurrent sessions/day, sub-ms lock contention |
| Repo | New standalone repo | Clean separation from benchmarking tool |

---

## Tech Stack

```
Framework:        Next.js 16 (App Router)
Language:         TypeScript (strict)
Styling:          Tailwind CSS 4 + Shadcn UI
ORM:              Drizzle ORM + Drizzle Kit
Database:         PostgreSQL via Neon (@neondatabase/serverless)
Auth:             Clerk (@clerk/nextjs)
Payments:         Stripe (stripe npm package)
Access Control:   KISI REST API (custom thin client — see rationale below)
Background Jobs:  Inngest
Email:            Resend + React Email
Validation:       Zod
State:            TanStack Query (server state) + React useState (local)
Timezone:         date-fns + date-fns-tz
```

### Package Audit

| Package | Version | Weekly Downloads | Status | Notes |
|---|---|---|---|---|
| `drizzle-orm` | 0.45.1 | ~5M | Production-ready | No external deps, 7.4kb min+gzip |
| `@clerk/nextjs` | latest | ~1M+ | Production-ready | Confirm Next.js 16 compat at scaffold time |
| `inngest` | latest | ~100k+ | Production-ready | Free tier: 50k runs/mo. Step functions are the killer feature |
| `stripe` | latest | ~2M+ | Production-ready | Official Stripe SDK |
| `resend` | latest | ~200k+ | Production-ready | Simple email API, React Email integration |
| `@react-email/components` | latest | ~300k+ | Production-ready | React-native email templates |
| `zod` | latest | ~15M+ | Production-ready | Already used in sauna-session-stats |
| `date-fns` | latest | ~20M+ | Production-ready | Already used in sauna-session-stats |

### Why NOT `kisi-client` npm

The official `kisi-client` npm package (v8.0.0) was last published 3 years ago, has 56 weekly downloads, depends on `axios` + `humps`, and wraps authentication patterns (org domain login) we don't need — we use API key auth directly. A thin custom client (~50 lines wrapping `fetch`) is simpler, lighter, and easier to maintain.

---

## Database Schema (Drizzle)

### Entity Relationship Overview

```
venues 1──* sessionTemplates 1──* sessions 1──* bookings *──1 users
  │                                   │            │           │
  │                                   │            │           │
  └─── membershipPlans 1──* memberships ───────────┘           │
  │                              │                             │
  └─── promoCodes                │                             │
                                 │                             │
                          payments ─────────────────────────────┘
                                 │
                    kisiAccessGrants ──── kisiDoorEvents
```

### Tables

```typescript
// src/db/schema.ts
import {
  pgTable, pgEnum, integer, text, varchar, boolean,
  timestamp, numeric, jsonb, uuid, uniqueIndex, index,
} from 'drizzle-orm/pg-core';

// ── Shared column helpers ─────────────────────────────────
const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdateFn(() => new Date()),
};
const softDelete = {
  deletedAt: timestamp('deleted_at'),
};

// ── Enums ─────────────────────────────────────────────────
export const bookingStatusEnum = pgEnum('booking_status', [
  'confirmed', 'cancelled', 'no_show', 'checked_in',
]);
export const membershipStatusEnum = pgEnum('membership_status', [
  'active', 'paused', 'cancelled', 'expired',
]);
export const membershipTypeEnum = pgEnum('membership_type', [
  'subscription', 'punch_card', 'day_pass', 'trial',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded',
]);
export const accessGrantTypeEnum = pgEnum('access_grant_type', [
  'booking', 'membership', 'manual',
]);
export const sessionTypeEnum = pgEnum('session_type', [
  'sauna', 'ice_bath', 'combined', 'special_event', 'private',
]);

// ── Venues ────────────────────────────────────────────────
export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  timezone: varchar('timezone', { length: 100 }).notNull(), // 'Australia/Melbourne'
  address: text('address'),
  kisiPlaceId: integer('kisi_place_id'),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  settings: jsonb('settings').$type<{
    cancellationWindowMinutes: number;  // e.g. 120 = 2hr before session
    bookingOpenDaysAhead: number;       // how far ahead bookings open
    accessBufferMinutes: number;        // KISI: minutes before/after session
    maxBookingsPerUser: number;         // per-user cap for waitlist fairness
    defaultCapacity: number;
  }>(),
  ...timestamps,
  ...softDelete,
});

// ── Users ─────────────────────────────────────────────────
// Source of truth for identity is Clerk.
// This table stores booking/membership-specific data.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 320 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  kisiMemberId: integer('kisi_member_id'), // KISI member ID once provisioned
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  role: varchar('role', { length: 20 }).notNull().default('member'), // 'admin' | 'member'
  notes: text('notes'),
  ...timestamps,
  ...softDelete,
}, (table) => [
  uniqueIndex('users_clerk_id_idx').on(table.clerkUserId),
  index('users_email_idx').on(table.email),
]);

// ── Session Templates (recurring schedule definitions) ────
export const sessionTemplates = pgTable('session_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  name: varchar('name', { length: 255 }).notNull(),       // "Morning Sauna"
  sessionType: sessionTypeEnum('session_type').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  capacity: integer('capacity').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  location: varchar('location', { length: 255 }),          // room name within venue
  level: varchar('level', { length: 100 }),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  recurrenceRule: jsonb('recurrence_rule').$type<{
    frequency: 'daily' | 'weekly';
    daysOfWeek: number[];   // 0=Sun...6=Sat
    startTime: string;       // 'HH:mm' in venue timezone
    endTime: string;         // 'HH:mm' in venue timezone
    validFrom: string;       // ISO date
    validUntil?: string;     // ISO date, null = indefinite
  }>(),
  kisiGroupId: integer('kisi_group_id'),
  ...timestamps,
});

// ── Sessions (concrete scheduled instances) ───────────────
// Equivalent of MomenceSession — each row is a bookable time slot.
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  templateId: uuid('template_id').references(() => sessionTemplates.id),
  name: varchar('name', { length: 255 }).notNull(),
  sessionType: sessionTypeEnum('session_type').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  capacity: integer('capacity').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  location: varchar('location', { length: 255 }),
  level: varchar('level', { length: 100 }),
  inPerson: boolean('in_person').notNull().default(true),
  isCancelled: boolean('is_cancelled').notNull().default(false),
  cancellationReason: text('cancellation_reason'),
  instructorId: uuid('instructor_id').references(() => users.id),
  notes: text('notes'),
  ...timestamps,
}, (table) => [
  index('sessions_venue_starts_idx').on(table.venueId, table.startsAt),
  index('sessions_template_idx').on(table.templateId),
]);

// ── Bookings ──────────────────────────────────────────────
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  status: bookingStatusEnum('status').notNull().default('confirmed'),
  guestCount: integer('guest_count').notNull().default(1),
  pricePaid: numeric('price_paid', { precision: 10, scale: 2 }),
  paymentId: uuid('payment_id').references(() => payments.id),
  membershipId: uuid('membership_id').references(() => memberships.id),
  creditDeducted: boolean('credit_deducted').notNull().default(false),
  kisiAccessGrantId: varchar('kisi_access_grant_id', { length: 255 }),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  waitlistPosition: integer('waitlist_position'), // null = not on waitlist
  ...timestamps,
}, (table) => [
  index('bookings_session_idx').on(table.sessionId),
  index('bookings_user_idx').on(table.userId),
  uniqueIndex('bookings_session_user_idx').on(table.sessionId, table.userId),
]);

// ── Membership Plans (what you sell) ──────────────────────
export const membershipPlans = pgTable('membership_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: membershipTypeEnum('type').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  intervalMonths: integer('interval_months'),               // subscriptions: 1 = monthly
  creditCount: integer('credit_count'),                      // punch cards
  validDays: integer('valid_days'),                          // day passes / punch card expiry
  sessionsPerWeek: integer('sessions_per_week'),             // booking frequency limit
  sessionTypes: jsonb('session_types').$type<string[]>(),    // which session types this covers
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  kisiGroupId: integer('kisi_group_id'),                     // KISI group for persistent access
  isActive: boolean('is_active').notNull().default(true),
  description: text('description'),
  ...timestamps,
});

// ── Memberships (what a user owns) ────────────────────────
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  planId: uuid('plan_id').notNull().references(() => membershipPlans.id),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  status: membershipStatusEnum('status').notNull().default('active'),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  creditsRemaining: integer('credits_remaining'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index('memberships_user_idx').on(table.userId),
  index('memberships_venue_status_idx').on(table.venueId, table.status),
]);

// ── Payments ──────────────────────────────────────────────
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('aud'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  refundedAmount: numeric('refunded_amount', { precision: 10, scale: 2 }).default('0'),
  metadata: jsonb('metadata'),
  ...timestamps,
});

// ── Promo Codes ───────────────────────────────────────────
export const promoCodes = pgTable('promo_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  code: varchar('code', { length: 50 }).notNull(),
  discountType: varchar('discount_type', { length: 20 }).notNull(), // 'percent' | 'fixed'
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  maxUses: integer('max_uses'),
  currentUses: integer('current_uses').notNull().default(0),
  validFrom: timestamp('valid_from', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  applicablePlans: jsonb('applicable_plans').$type<string[]>(),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
}, (table) => [
  uniqueIndex('promo_code_venue_idx').on(table.venueId, table.code),
]);

// ── KISI Access Grants (audit log) ────────────────────────
export const kisiAccessGrants = pgTable('kisi_access_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: accessGrantTypeEnum('type').notNull(),
  kisiGroupLinkId: varchar('kisi_group_link_id', { length: 255 }),
  kisiGroupId: integer('kisi_group_id'),
  bookingId: uuid('booking_id').references(() => bookings.id),
  membershipId: uuid('membership_id').references(() => memberships.id),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  isRevoked: boolean('is_revoked').notNull().default(false),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokeReason: text('revoke_reason'),
  ...timestamps,
}, (table) => [
  index('kisi_grants_user_idx').on(table.userId),
  index('kisi_grants_booking_idx').on(table.bookingId),
]);

// ── KISI Door Events (webhook-sourced attendance) ─────────
export const kisiDoorEvents = pgTable('kisi_door_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  kisiEventId: varchar('kisi_event_id', { length: 255 }).notNull().unique(),
  lockId: integer('lock_id').notNull(),
  lockName: varchar('lock_name', { length: 255 }),
  actorEmail: varchar('actor_email', { length: 320 }),
  actorKisiId: integer('actor_kisi_id'),
  userId: uuid('user_id').references(() => users.id),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  metadata: jsonb('metadata'),
  ...timestamps,
});

// ── Waitlist ──────────────────────────────────────────────
export const waitlistEntries = pgTable('waitlist_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  position: integer('position').notNull(),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  convertedToBookingId: uuid('converted_to_booking_id').references(() => bookings.id),
  ...timestamps,
}, (table) => [
  uniqueIndex('waitlist_session_user_idx').on(table.sessionId, table.userId),
]);
```

---

## KISI Integration Architecture

### Concept Mapping

| KISI Concept | Our Domain | Usage |
|---|---|---|
| Place | Venue | 1:1 — store `kisiPlaceId` on `venues` |
| Group | Session type or membership plan | Defines which doors are accessible |
| Member | User | Provisioned on first booking, store `kisiMemberId` on `users` |
| Group Link | Booking access grant | Time-bound credential: `valid_from`/`valid_until` |
| Lock | Physical door | Queried live from KISI, not stored locally |
| Event (webhook) | Door unlock event | Mapped to attendance/check-in |

### API Details

- **Base URL:** `https://api.kisi.io`
- **Auth:** `Authorization: KISI-LOGIN <API_KEY>`
- **Rate limit:** 5 requests/second/user (implement exponential backoff on 429)
- **No API versioning** — backwards-compatible changes only

### Key Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/group_links` | POST | Create time-bound access (booking) |
| `/group_links/{id}` | DELETE | Revoke access (cancellation) |
| `/members` | POST | Add user to group (membership access) |
| `/members/{id}` | DELETE | Remove from group (membership expired) |
| `/locks` | GET | List available locks for a place |
| `/locks/{id}/unlock` | POST | Manual unlock (admin) |
| `/groups` | GET/POST | Manage access groups |

### Service Layer

```
src/lib/kisi/
├── client.ts            # Thin fetch wrapper (~50 lines, no kisi-client npm)
├── accessManager.ts     # grantBookingAccess, revokeBookingAccess, grantMembershipAccess
├── webhookHandler.ts    # Parse + validate KISI webhook payloads
└── types.ts             # KISI-specific TypeScript types
```

### Flow 1: Booking → Door Access

```
User              API Route           Inngest              KISI API          Database
 │                    │                   │                    │                 │
 │── POST /bookings →│                   │                    │                 │
 │                    │── BEGIN TX ──────>│                    │                 │
 │                    │── SELECT count(*) │                    │                 │
 │                    │   WHERE session_id│                    │                 │
 │                    │   AND status =    │                    │                 │
 │                    │   'confirmed'     │                    │                 │
 │                    │   FOR UPDATE ────>│                    │                 │
 │                    │                   │                    │                 │
 │                    │  [count < cap]    │                    │                 │
 │                    │── INSERT booking >│                    │                 │
 │                    │── COMMIT ────────>│                    │                 │
 │                    │── inngest.send(   │                    │                 │
 │                    │  'booking/created')                    │                 │
 │<── 201 Created ────│                   │                    │                 │
 │                    │                   │← trigger ──────────│                 │
 │                    │                   │                    │                 │
 │                    │                   │── step: grant KISI │                 │
 │                    │                   │── POST /group_links>                 │
 │                    │                   │   { group_id,      │                 │
 │                    │                   │     email,         │                 │
 │                    │                   │     valid_from:    │                 │
 │                    │                   │       start-10min, │                 │
 │                    │                   │     valid_until:   │                 │
 │                    │                   │       end+10min }  │                 │
 │                    │                   │<── { id } ─────────│                 │
 │                    │                   │                    │                 │
 │                    │                   │── step: save grant │                 │
 │                    │                   │── INSERT kisi_     │                 │
 │                    │                   │   access_grants ──>│                 │
 │                    │                   │── UPDATE booking   │                 │
 │                    │                   │   kisi_access_     │                 │
 │                    │                   │   grant_id ───────>│                 │
 │                    │                   │                    │                 │
 │                    │                   │── step: email      │                 │
 │                    │                   │── Resend ──────────│                 │
```

### Flow 2: Cancellation → Revoke Access

```
User              API Route           Inngest              KISI API          Database
 │                    │                   │                    │                 │
 │── PATCH /bookings/X                   │                    │                 │
 │   { status:        │                   │                    │                 │
 │     cancelled }   →│                   │                    │                 │
 │                    │── UPDATE booking  │                    │                 │
 │                    │   status=cancelled│                    │                 │
 │                    │── inngest.send(   │                    │                 │
 │                    │  'booking/        │                    │                 │
 │                    │   cancelled')     │                    │                 │
 │<── 200 OK ─────────│                   │                    │                 │
 │                    │                   │← trigger           │                 │
 │                    │                   │── step: revoke     │                 │
 │                    │                   │── DELETE           │                 │
 │                    │                   │   /group_links/{id}>                 │
 │                    │                   │── step: update     │                 │
 │                    │                   │   access grant     │                 │
 │                    │                   │   is_revoked=true >│                 │
 │                    │                   │── step: promote    │                 │
 │                    │                   │   waitlist (find   │                 │
 │                    │                   │   next, book,      │                 │
 │                    │                   │   grant KISI)      │                 │
```

### Flow 3: Membership → Persistent Access

```
Stripe Webhook      API Route           Inngest              KISI API
 │                    │                   │                    │
 │── invoice.paid ──→│                   │                    │
 │                    │── UPDATE          │                    │
 │                    │   membership      │                    │
 │                    │   period dates    │                    │
 │                    │── inngest.send(   │                    │
 │                    │  'membership/     │                    │
 │                    │   renewed')       │                    │
 │                    │                   │← trigger           │
 │                    │                   │── step: ensure     │
 │                    │                   │   KISI group member│
 │                    │                   │── POST /members    │
 │                    │                   │   { group_id,     >│
 │                    │                   │     email }        │
 │                    │                   │  (idempotent)      │
```

### Flow 4: Door Unlock → Auto Check-in

```
KISI Webhook        API Route           Database
 │                    │                   │
 │── POST /webhooks/ │                   │
 │   kisi             │                   │
 │   { event:         │                   │
 │     'lock.unlock', │                   │
 │     actor.email,   │                   │
 │     lock.id }     →│                   │
 │                    │── Resolve user    │
 │                    │   from email      │
 │                    │── INSERT          │
 │                    │   kisi_door_event>│
 │                    │── Find booking    │
 │                    │   for user +      │
 │                    │   time window     │
 │                    │── UPDATE booking  │
 │                    │   checked_in_at = │
 │                    │   now(), status = │
 │                    │   'checked_in' ──>│
 │<── 200 OK ─────────│                   │
```

### Offline Fallback

KISI hardware stores a local access list on the lock controller. When internet drops, locks still work for recently-synced credentials. Access grants created at booking time (not session time) ensures credentials are pre-synced. No additional code needed.

---

## API Route Structure

```
src/app/
├── api/
│   ├── inngest/route.ts                    # Inngest webhook endpoint
│   │
│   ├── webhooks/
│   │   ├── clerk/route.ts                  # user.created/updated → sync users table
│   │   ├── stripe/route.ts                 # payment events, subscription lifecycle
│   │   └── kisi/route.ts                   # door events → attendance tracking
│   │
│   ├── sessions/
│   │   ├── route.ts                        # GET: list (date range, type filters)
│   │   ├── [id]/route.ts                   # GET detail, PATCH update, DELETE cancel
│   │   └── generate/route.ts              # POST: generate from template + date range
│   │
│   ├── bookings/
│   │   ├── route.ts                        # GET: list, POST: create
│   │   ├── [id]/route.ts                   # GET detail, PATCH cancel
│   │   └── [id]/check-in/route.ts          # POST: manual check-in
│   │
│   ├── session-templates/
│   │   ├── route.ts                        # GET list, POST create
│   │   └── [id]/route.ts                   # GET, PATCH, DELETE
│   │
│   ├── memberships/
│   │   ├── plans/
│   │   │   ├── route.ts                    # GET list, POST create
│   │   │   └── [id]/route.ts               # PATCH, DELETE
│   │   ├── route.ts                        # GET user memberships, POST purchase
│   │   ├── [id]/route.ts                   # GET detail, PATCH pause/cancel
│   │   └── [id]/credits/route.ts           # GET balance + history
│   │
│   ├── payments/
│   │   ├── route.ts                        # GET history
│   │   ├── create-checkout/route.ts        # POST: Stripe Checkout session
│   │   ├── create-portal/route.ts          # POST: Stripe Customer Portal
│   │   └── promo-codes/
│   │       ├── route.ts                    # GET, POST
│   │       └── validate/route.ts           # POST: validate + return discount
│   │
│   ├── users/
│   │   ├── route.ts                        # GET list (admin), search
│   │   ├── [id]/route.ts                   # GET profile + booking history
│   │   └── me/route.ts                     # GET current user
│   │
│   ├── kisi/
│   │   ├── locks/route.ts                  # GET available locks
│   │   ├── unlock/route.ts                 # POST manual unlock (admin)
│   │   └── access-grants/route.ts          # GET grants for a user
│   │
│   └── admin/
│       ├── venues/route.ts                 # GET/PATCH venue settings
│       ├── dashboard/route.ts              # GET summary stats (Phase 2)
│       └── reports/route.ts                # GET exportable data (Phase 2)
│
├── (admin)/                                # Admin pages (Clerk role-gated)
│   ├── layout.tsx
│   ├── sessions/page.tsx
│   ├── bookings/page.tsx
│   ├── members/page.tsx
│   └── settings/page.tsx
│
├── (member)/                               # Member pages (Phase 2)
│   ├── layout.tsx
│   ├── book/page.tsx
│   ├── my-bookings/page.tsx
│   └── account/page.tsx
│
├── sign-in/[[...sign-in]]/page.tsx
├── sign-up/[[...sign-up]]/page.tsx
└── layout.tsx                              # Root: ClerkProvider + TanStack QueryProvider
```

---

## Inngest Functions

```
src/inngest/
├── client.ts                        # Inngest client init
├── events.ts                        # Event type definitions
└── functions/
    ├── booking-created.ts           # Grant KISI access → send confirmation email
    ├── booking-cancelled.ts         # Revoke KISI → promote waitlist → send email
    ├── membership-activated.ts      # Add to KISI group → send welcome email
    ├── membership-expired.ts        # Remove from KISI group → send expiry email
    ├── membership-renewed.ts        # Extend KISI access → send receipt
    ├── session-reminder.ts          # 2hr before: step.sleepUntil → send reminder
    ├── generate-sessions.ts         # Cron: generate next 2 weeks from templates
    ├── no-show-detection.ts         # After session: mark unchecked-in as no_show
    └── waitlist-expiry.ts           # After notification window: release spots
```

---

## Project Structure

```
slow-folk-booking/
├── src/
│   ├── app/                          # Next.js App Router (see API Routes above)
│   ├── components/
│   │   ├── ui/                       # Shadcn UI (generated, do not edit)
│   │   ├── admin/                    # Admin components
│   │   ├── booking/                  # Booking flow components
│   │   └── shared/                   # Layout, nav, etc.
│   ├── db/
│   │   ├── schema.ts                # Drizzle schema (see above)
│   │   ├── relations.ts             # Drizzle relations
│   │   ├── index.ts                 # Neon + Drizzle client init
│   │   └── seed.ts                  # Dev seed data
│   ├── lib/
│   │   ├── kisi/
│   │   │   ├── client.ts            # Thin fetch wrapper
│   │   │   ├── accessManager.ts     # High-level access operations
│   │   │   ├── webhookHandler.ts    # Webhook parsing
│   │   │   └── types.ts
│   │   ├── stripe/
│   │   │   ├── client.ts            # Stripe SDK init
│   │   │   ├── checkout.ts          # Create checkout sessions
│   │   │   ├── subscriptions.ts     # Subscription management
│   │   │   └── webhookHandler.ts    # Webhook parsing
│   │   ├── booking/
│   │   │   ├── createBooking.ts     # Core logic with pessimistic locking
│   │   │   ├── cancelBooking.ts
│   │   │   ├── waitlist.ts
│   │   │   └── availability.ts      # Real-time seat counting
│   │   ├── membership/
│   │   │   ├── creditManager.ts     # Deduct/restore credits
│   │   │   └── statusManager.ts     # Activate/pause/cancel
│   │   ├── sessions/
│   │   │   ├── generator.ts         # Generate from templates
│   │   │   └── validator.ts         # Zod schemas
│   │   ├── email/
│   │   │   ├── client.ts            # Resend client
│   │   │   └── templates/
│   │   │       ├── BookingConfirmation.tsx
│   │   │       ├── BookingCancelled.tsx
│   │   │       └── SessionReminder.tsx
│   │   └── utils.ts
│   ├── inngest/                     # (see above)
│   ├── hooks/
│   │   ├── useSessions.ts
│   │   ├── useBookings.ts
│   │   └── useMembership.ts
│   ├── types/
│   │   └── index.ts                 # Domain types (DB types from Drizzle)
│   ├── middleware.ts                # Clerk auth middleware
│   └── styles/
│       └── globals.css
├── scripts/
│   ├── seed.ts                      # Database seeding
│   ├── generate-sessions.ts         # CLI: generate sessions from templates
│   ├── list-bookings.ts             # CLI: view bookings for a date
│   ├── list-members.ts              # CLI: list members by status
│   ├── create-promo.ts              # CLI: create promo code
│   ├── kisi-test.ts                 # CLI: test KISI connection + unlock
│   └── migrate.ts                   # Run Drizzle migrations
├── drizzle/                         # Generated migration SQL files
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.example
├── .env.local                       # (gitignored)
├── CLAUDE.md
└── README.md
```

---

## Environment Variables

```bash
# .env.example

# ── Database ──────────────────────────────────────
DATABASE_URL=                        # Neon connection string (pooled)
DATABASE_URL_UNPOOLED=               # Neon direct connection (migrations)

# ── Auth (Clerk) ──────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=                # For user sync webhooks

# ── Payments (Stripe) ────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# ── Access Control (KISI) ────────────────────────
KISI_API_KEY=                        # Organization API key
KISI_PLACE_ID=                       # Default venue place ID
KISI_WEBHOOK_SECRET=                 # For door event webhooks

# ── Email (Resend) ───────────────────────────────
RESEND_API_KEY=
EMAIL_FROM=                          # e.g. bookings@slowfolk.com.au

# ── Background Jobs (Inngest) ────────────────────
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# ── App ──────────────────────────────────────────
NEXT_PUBLIC_APP_URL=                 # e.g. https://book.slowfolk.com.au
```

---

## Phased Delivery Plan

### Phase 0: Scaffold (1-2 days)
**Goal: Running Next.js app with database, auth, and empty admin shell.**

- `npx create-next-app@latest slow-folk-booking --ts --tailwind --app --src-dir`
- Install core deps: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `@clerk/nextjs`, `inngest`, `zod`
- Shadcn UI components: button, card, table, dialog, form, input, select, toast
- Drizzle config + schema (venues, users tables only)
- Clerk middleware + sign-in/sign-up pages
- Inngest client + serve route
- `CLAUDE.md` + `.env.example`
- CLI: `scripts/seed.ts` (create venue + admin user)

### Phase 1a: Sessions & Templates (3-4 days)
**Goal: Admin can create session templates and generate a schedule.**

- Add `sessionTemplates` + `sessions` tables
- `src/lib/sessions/generator.ts` — generate concrete sessions from template + date range
- API routes: `POST /session-templates`, `POST /sessions/generate`, `GET /sessions`
- Admin pages: session template CRUD, session list (basic table)
- CLI: `scripts/generate-sessions.ts`
- Inngest cron: auto-generate sessions weekly
- Zod validation schemas

### Phase 1b: Bookings (3-4 days)
**Goal: Admin can book users into sessions. Availability enforced.**

- Add `bookings` + `waitlistEntries` tables
- `src/lib/booking/createBooking.ts` with `SELECT FOR UPDATE`
- `src/lib/booking/availability.ts` — `{ capacity, booked, available }`
- `src/lib/booking/waitlist.ts` — add/promote
- API routes: `POST /bookings`, `PATCH /bookings/[id]`, `POST /bookings/[id]/check-in`
- Admin pages: booking list, manual book/cancel
- Cancellation policy enforcement
- CLI: `scripts/list-bookings.ts --date 2026-03-20`

### Phase 1c: Payments (3-4 days)
**Goal: Users pay for single sessions via Stripe Checkout.**

- Add `payments` + `promoCodes` tables
- Stripe SDK + webhook handler
- `POST /payments/create-checkout` — Stripe Checkout Session
- Webhook: `payment_intent.succeeded` → confirm booking
- Promo code validation
- Refund handling (partial + full)
- CLI: `scripts/create-promo.ts`

### Phase 1d: Memberships & Credits (4-5 days)
**Goal: Membership plans, subscriptions, punch card credits.**

- Add `membershipPlans` + `memberships` tables
- Stripe subscription creation
- Credit deduction on booking
- Webhooks: `invoice.paid` → renew, `subscription.deleted` → expire
- `POST /memberships` — purchase membership
- Admin pages: plan CRUD, member status
- CLI: `scripts/list-members.ts --status active`

### Phase 1e: KISI Integration (3-4 days)
**Goal: Bookings grant door access. Memberships grant persistent access. Door = check-in.**

- `src/lib/kisi/client.ts` — thin fetch wrapper
- `src/lib/kisi/accessManager.ts`:
  - `grantBookingAccess(booking)` → `POST /group_links`
  - `revokeBookingAccess(booking)` → `DELETE /group_links/{id}`
  - `grantMembershipAccess(membership)` → `POST /members`
  - `revokeMembershipAccess(membership)` → `DELETE /members/{id}`
- Add `kisiAccessGrants` + `kisiDoorEvents` tables
- Inngest: booking created/cancelled → KISI grant/revoke
- Webhook: `POST /webhooks/kisi` → resolve user, mark check-in
- CLI: `scripts/kisi-test.ts`

### Phase 1f: Email Notifications (1-2 days)
**Goal: Transactional emails for core flows.**

- Resend + React Email setup
- Templates: `BookingConfirmation`, `BookingCancelled`, `SessionReminder`
- Inngest step in `booking-created` → send confirmation
- Inngest `session-reminder` → `step.sleepUntil(startsAt - 2hrs)`

### Phase 1 Total: ~17-21 days (3-4 weeks with AI assistance)

---

### Phase 2 (iterate after MVP)

- **Public booking page** — member-facing `/book` with session browser
- **Admin dashboard** — occupancy charts, revenue, no-show rates (reuse patterns from `sauna-session-stats/benchmarkMetrics.ts`)
- **No-show detection** — Inngest post-session job marks unchecked-in as `no_show`
- **Waitlist notifications** — email when spot opens, auto-expire if not claimed
- **Guest bookings** — allow booking without account (email-only)
- **Multi-venue admin** — venue switcher, per-venue settings

### Phase 3 (later)

- **Reporting dashboard** — full analytics (leverage `metricsCalculator.ts` + `venueInsights.ts` patterns)
- **Public widget** — embeddable booking widget for external sites
- **Mobile app** — React Native or PWA
- **Multi-location KISI** — different lock groups per room/facility
- **Instructor management** — assign staff to sessions, track utilization

---

## Core Booking Logic (Reference)

The critical path for correctness — booking creation with pessimistic locking:

```typescript
// src/lib/booking/createBooking.ts
import { db } from '@/db';
import { bookings, sessions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { inngest } from '@/inngest/client';

export async function createBooking(input: {
  sessionId: string;
  userId: string;
  guestCount?: number;
}) {
  const { sessionId, userId, guestCount = 1 } = input;

  return await db.transaction(async (tx) => {
    // 1. Lock the session row to prevent concurrent overbooking
    const [session] = await tx
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .for('update');

    if (!session) throw new Error('Session not found');
    if (session.isCancelled) throw new Error('Session is cancelled');

    // 2. Count confirmed bookings (also locked by the session FOR UPDATE)
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.sessionId, sessionId),
          eq(bookings.status, 'confirmed')
        )
      );

    const available = session.capacity - count;
    if (guestCount > available) {
      throw new Error(`Only ${available} spots available`);
    }

    // 3. Insert the booking
    const [booking] = await tx
      .insert(bookings)
      .values({
        sessionId,
        userId,
        guestCount,
        status: 'confirmed',
      })
      .returning();

    return booking;
  });

  // 4. After commit — trigger async KISI + email via Inngest
  // (called outside the transaction in the API route)
}
```

---

## Sources

Architecture decisions informed by:
- [KISI API Docs](https://docs.kisi.io/platform/apis/) — REST API, 5 req/s rate limit, group_links for time-bound access
- [KISI Interactive Reference](https://api.kisi.io/docs) — Full endpoint documentation
- [KISI Digital Credentials Guide](https://docs.kisi.io/platform/apis/how_to_guides/manage_access_rights/send_digital_credentials/) — group_links with valid_from/valid_until
- [Drizzle ORM](https://orm.drizzle.team/) — 5M+ weekly downloads, serverless-optimized
- [Inngest](https://www.inngest.com/) — Step functions, 50k free runs/mo
- [Clerk](https://clerk.com/) — Pre-built auth for Next.js
- [Neon](https://neon.tech/) — Serverless Postgres with branching
