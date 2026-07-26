// Momence API Configuration

export const API_CONFIG = {
  baseUrl: 'https://readonly-api.momence.com/host-plugins/host',
  defaultHostId: '37867',
  sessionTypes: [
    'course-class',
    'fitness',
    'retreat',
    'special-event',
    'special-event-new',
  ] as const,
  pageSize: 100,
  /** Maximum number of pages to fetch per Momence host */
  maxPages: 250,
  /** Number of pages fetched in parallel per batch */
  batchSize: 10,
  /** Default lookback window when auto-fetching session history */
  defaultFetchWindowYears: 2,
} as const;

// Platform types for venue identification
export type Platform = 'momence' | 'glofox' | 'marianatek' | 'trybe' | 'portal' | 'xtraclubs' | 'acuity' | 'hapana' | 'bsport';

export interface VenuePricingTier {
  label: string;
  casualRate: number;       // single-visit price
  pack5PerVisit?: number;   // per-visit rate on a 5-pack
  pack10PerVisit?: number;  // per-visit rate on a 10-pack
}

export interface VenueMembership {
  label: string;            // e.g. "Studio Membership"
  price: string;            // e.g. "$75 / week"
  description?: string;
}

export interface VenuePricingConfig {
  tiers: VenuePricingTier[];
  memberships?: VenueMembership[];
  note?: string;
  /** Currency prefix for tier rates (e.g. 'CHF '). Defaults to '$'. */
  currency?: string;
}

export interface VenueConfig {
  id: string;
  name: string;
  platform: Platform;
  location: string;
  /** IANA timezone name, e.g. 'Australia/Melbourne'. Used to localise operating hours. */
  timezone?: string;
  /** Short positive descriptor shown beneath the venue name on the report header. */
  tagline?: string;
  /** Known pricing tiers for display in the Operating Model section. */
  pricing?: VenuePricingConfig;
}

// Venue list
export const VENUES: VenueConfig[] = [
  {
    id: 'innerstudio', name: 'Inner Studio', platform: 'momence', location: 'Melbourne', timezone: 'Australia/Melbourne',
    pricing: {
      tiers: [
        // Casual rates rose from $45 to $47 on 2026-07-01 at both locations (confirmed in session data).
        // Pack rates below are from the Inner Studio website and have not been re-checked since that rise.
        { label: 'Sauna & Cold Plunge', casualRate: 47, pack5PerVisit: 40, pack10PerVisit: 35 },
        { label: 'Class+', casualRate: 47, pack5PerVisit: 40, pack10PerVisit: 35 },
        { label: 'Class Only', casualRate: 30 },
      ],
      memberships: [
        { label: 'Class Only Membership', price: '$50 / week', description: 'Unlimited class bookings + bath at $35/visit' },
        { label: 'Studio Membership', price: '$75 / week', description: 'Unlimited all sauna & plunge and Class+ sessions' },
      ],
      note: 'Pack credits valid across Sauna & Cold Plunge and Class+ sessions.',
    },
  },
  { id: '59636', name: 'Sol Sauna', platform: 'momence', location: 'Prahran', timezone: 'Australia/Melbourne', tagline: 'Melbourne\'s most loved urban sauna — authentic heat, cold plunge, and community.' },
  { id: '49448', name: 'Aalto', platform: 'momence', location: 'Adelaide', timezone: 'Australia/Adelaide' },
  { id: '41167', name: 'EQ', platform: 'momence', location: 'South Melbourne', timezone: 'Australia/Melbourne' },
  // { id: '46052', name: 'Fjord, San Francisco', platform: 'momence', location: 'San Francisco', timezone: 'America/Los_Angeles' },
  { id: 'lore', name: 'Lore Bathing Club', platform: 'glofox', location: 'New York', timezone: 'America/New_York' },
  { id: 'projectmood', name: 'Project Mood', platform: 'marianatek', location: 'Melbourne', timezone: 'Australia/Melbourne' },
  { id: 'aerth', name: 'Ærth Saunas', platform: 'marianatek', location: 'Victoria BC', timezone: 'America/Vancouver' },
  { id: 'senseofself', name: 'Sense of Self', platform: 'trybe', location: 'Melbourne', timezone: 'Australia/Melbourne' },
  { id: '40726', name: 'Panda Society', platform: 'momence', location: '', timezone: 'Australia/Melbourne' },
  { id: 'portal', name: 'PORTAL° Thermaculture', platform: 'portal', location: 'Colorado · Montana · Minnesota', timezone: 'America/Denver' },
  { id: 'xtraclubs', name: 'Xtra Clubs', platform: 'xtraclubs', location: 'Sydney', timezone: 'Australia/Sydney' },
  // Akari uses Glofox for memberships only — no session bookings exist to
  // report on. Its live feed is a Google Sheets occupancy snapshot (see
  // GLOFOX_CONFIG.akariSaunas); re-enable if an occupancy view is built.
  // { id: 'akari', name: 'Akari Saunas', platform: 'glofox', location: 'Brooklyn', timezone: 'America/New_York' },
  { id: 'wellnesssocial', name: 'Wellness Social Club', platform: 'glofox', location: 'Melbourne', timezone: 'Australia/Melbourne' },
  { id: 'saunagoose', name: 'Sauna Goose', platform: 'acuity', location: 'Melbourne', timezone: 'Australia/Melbourne' },
  { id: 'thecornersauna', name: 'The Corner Sauna', platform: 'acuity', location: 'Apollo Bay', timezone: 'Australia/Sydney' },
  { id: 'alchemysaunas', name: 'Alchemy Saunas', platform: 'hapana', location: 'Perth', timezone: 'Australia/Perth' },
  {
    id: 'keenwellbeing', name: 'KEEN Wellbeing', platform: 'bsport', location: 'Zurich', timezone: 'Europe/Zurich',
    pricing: {
      currency: 'CHF ',
      tiers: [
        { label: 'Journeys (group & solo)', casualRate: 27, pack10PerVisit: 27 },
      ],
      memberships: [
        { label: 'Unlimited Membership', price: 'CHF 249 / month', description: 'Unlimited group classes and solo journeys' },
      ],
      note: 'Bookings are credit-based on bsport; CHF rates from keenwellbeing.com (10-pack CHF 270). Summer special: 10-pack CHF 200, Unlimited CHF 180/month.',
    },
  },
];

// Glofox configuration
export const GLOFOX_CONFIG = {
  loreBathingClub: {
    branchId: '67c5eb09efb4277b06084eb6',
    namespace: 'lorebathingclub',
    name: 'Lore Bathing Club',
    timezone: 'America/New_York',
    // Branch deactivated on Glofox (~June 2026): guest login returns "no active
    // branch", so the weekly token refresh fails for lore and fetches 401.
    // Reports serve the git-tracked cache (frozen at 2026-03-03).
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJfIiwiZXhwIjoxNzgyODkxMjM1LCJpYXQiOjE3ODAyOTkyMzUsImlzcyI6Il8iLCJ1c2VyIjp7Il9pZCI6Imd1ZXN0IiwibmFtZXNwYWNlIjoibG9yZWJhdGhpbmdjbHViIiwiYnJhbmNoX2lkIjoiNjdjNWViMDllZmI0Mjc3YjA2MDg0ZWI2IiwiZmlyc3RfbmFtZSI6Ikd1ZXN0IiwibGFzdF9uYW1lIjoiVXNlciIsInR5cGUiOiJHVUVTVCIsImlzU3VwZXJBZG1pbiI6ZmFsc2V9fQ.9LaCJTJI4LOk-Y_7HEyQMV46z89deXCX1K774VE8ViI',
    tokenExpiry: '2026-07-01',
    operatingSince: '2026-01-01',
  },
  akariSaunas: {
    branchId: '67cf4fe8ef346c3817003b8f',
    namespace: '', // TODO: discover via guest token probe
    name: 'Akari Saunas',
    timezone: 'America/New_York',
    // Glofox is used for memberships, not session booking
    token: '',
    tokenExpiry: '',
    operatingSince: '2025-01-01',
    // Google Sheets live occupancy feed (from akarisauna.com JS)
    // SingleRow!A2:E2 → [lastUpdatedDatetime, rawOccupancy (0–0.2), prettyDate, prettyTime, occupancyLabel]
    // Closures!A2:A1001 → list of special closure dates
    sheetsSpreadsheetId: '1yrIBz86iBFtin1_glrHsl0g05raVsisvbgIYaAYtin4',
    sheetsApiKey: 'AIzaSyB_CloyomHHpxfqBS8jJFBeIiR_MjE4gAQ',
    sheetsRange: 'SingleRow!A2:E2',
    // Operating hours (from their website JS)
    // Mon–Fri: 8am–10pm ET, Sat–Sun: 9am–8pm ET
  },
  wellnessSocialClub: {
    branchId: '6769bc07dd963d1b0108804b',
    namespace: "wellnesssocialbusine",
    name: 'Wellness Social Club',
    timezone: 'Australia/Melbourne',
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJfIiwiZXhwIjoxNzg3MjE0NjQ3LCJpYXQiOjE3ODQ1MzYyNDcsImlzcyI6Il8iLCJ1c2VyIjp7Il9pZCI6Imd1ZXN0IiwibmFtZXNwYWNlIjoid2VsbG5lc3Nzb2NpYWxidXNpbmUiLCJicmFuY2hfaWQiOiI2NzY5YmMwN2RkOTYzZDFiMDEwODgwNGIiLCJmaXJzdF9uYW1lIjoiR3Vlc3QiLCJsYXN0X25hbWUiOiJVc2VyIiwidHlwZSI6IkdVRVNUIiwiaXNTdXBlckFkbWluIjpmYWxzZX19.hLQ3HBmizbSP3OUhAnjZEKlTTxVRehM3QT5QHLHxYkk',
    tokenExpiry: '2026-08-20',
    operatingSince: '2025-06-01',
  },
} as const;

/** Resolve the Glofox config entry for a given venue hostId. */
export function getGlofoxConfig(hostId: string) {
  const map: Record<string, (typeof GLOFOX_CONFIG)[keyof typeof GLOFOX_CONFIG]> = {
    lore: GLOFOX_CONFIG.loreBathingClub,
    wellnesssocial: GLOFOX_CONFIG.wellnessSocialClub,
  };
  const cfg = map[hostId];
  if (!cfg) throw new Error(`No Glofox config for hostId "${hostId}"`);
  return cfg;
}

// TryBe configuration (public customer API — no auth required)
export const TRYBE_CONFIG = {
  senseOfSelf: {
    venueId: '9f40f5e4-d840-487a-b5cd-12e9a571b80e',
    // Each offering is a bookable session type. Sessions are fetched per-offering.
    offerings: [
      { id: '689bfaa6238f5106bb09ebef', name: 'Quiet Morning Bathhouse' },
      { id: '6861f7143c3fb8e08d061fa4', name: 'Bathhouse Session' },
    ],
    name: 'Sense of Self',
    timezone: 'Australia/Melbourne',
    // TryBe rooms ("Bathhouse", "Last Minute BH", "Quiet Morning Bathhouse") are
    // booking channels for the same physical venue, not separate locations.
    // All sessions are labelled with this single location so the report
    // aggregates them into one total.
    locationName: 'Collingwood',
    // TryBe only exposes upcoming/current sessions — past sessions are not accessible
    // via the public API. The fetcher merges newly fetched sessions with previously
    // cached past sessions to build up history over time.
    launchDate: '2025-07-07',
  },
} as const;

// Mariana Tek configuration (customer classes endpoint — no auth required)
// Note: ids are per-tenant — Project Mood and Ærth both having 48717/48541 is
// coincidence, not a copy-paste error (verified against each tenant's
// /locations endpoint).
export const MARIANATEK_CONFIG = {
  projectMood: {
    baseUrl: 'https://projectmood.marianatek.com/api/customer/v1',
    locationId: '48717',
    regionId: '48541',
    name: 'Project Mood',
    timezone: 'Australia/Melbourne',
    // Bathhouse sessions only (gym/pilates/reformer classes excluded).
    // 'Open Bathhouse' is the legacy title-case name; the tenant renamed to
    // uppercase and split into BATHHOUSE + OPEN BATHHOUSE in 2026.
    classTypeFilters: ['Open Bathhouse', 'OPEN BATHHOUSE', 'BATHHOUSE'],
  },
  aerthSaunas: {
    baseUrl: 'https://aerthsaunas.marianatek.com/api/customer/v1',
    locationId: '48717',
    regionId: '48541',
    name: 'Ærth Saunas',
    timezone: 'America/Vancouver',
    // Public group sessions; '90 min' is the legacy name of today's 1h 45min
    // cycle, kept so historical fetches retain the old era.
    classTypeFilters: [
      'Ærth Cycle (90 min)',
      'Ærth Cycle (1h 45 min)',
      'Ærth Cycle (1h 45min) - Aufguss',
      'Twilight Hour (60 min)',
    ],
  },
} as const;

/** Resolve the Mariana Tek config entry for a given venue hostId. */
export function getMarianaTekConfig(hostId: string) {
  const map: Record<string, (typeof MARIANATEK_CONFIG)[keyof typeof MARIANATEK_CONFIG]> = {
    projectmood: MARIANATEK_CONFIG.projectMood,
    aerth: MARIANATEK_CONFIG.aerthSaunas,
  };
  const cfg = map[hostId];
  if (!cfg) throw new Error(`No Mariana Tek config for hostId "${hostId}"`);
  return cfg;
}

// Xtra Clubs configuration (public schedule API — no auth required)
export const XTRA_CLUBS_CONFIG = {
  baseUrl: 'https://checkout.xtraclubs.au/api',
  name: 'Xtra Clubs',
  timezone: 'Australia/Sydney',
  locations: [
    { siteId: '65c468e98af2a3e02af945ae', name: 'Bondi Junction', operatingSince: '2024-01-01' },
    { siteId: '6785c335ead6da842a685ba1', name: 'Green Square', operatingSince: '2025-01-01' },
    { siteId: '67ee5f25751de5d4c7470c67', name: 'Merrickville', operatingSince: '2025-01-01' },
  ],
} as const;

// Inner Studio configuration (multi-location Momence venue)
export const INNER_STUDIO_CONFIG = {
  name: 'Inner Studio',
  timezone: 'Australia/Melbourne',
  locations: [
    { hostId: '37867', name: 'Collingwood' },
    { hostId: '190198', name: 'South Yarra' },
  ],
} as const;

// Portal Thermaculture configuration (custom Wix-backed booking platform — no auth required)
export const PORTAL_CONFIG = {
  baseUrl: 'https://book.portalthermaculture.com/api',
  name: 'Portal',
  timezone: 'America/Denver',
  locations: [
    { wixLocationId: '09d22dbe-dae2-4847-b657-90cf03ea5e67', name: 'Denver', operatingSince: '2025-03-26' },
    { wixLocationId: '8ac6d40a-fbbb-4524-9959-33da8cdc67bc', name: 'Boulder', operatingSince: '2025-03-26' },
    // This Wix record was renamed 'Lyons' Nov 2025 – mid-Jan 2026; sessions
    // self-label via the API's per-item location.name, so both appear in data.
    { wixLocationId: '44897ca4-c829-4108-8929-60be0a91fe60', name: 'Bozeman', operatingSince: '2025-03-16' },
  ],
  // Minneapolis uses Glofox instead of the Wix booking API — fetched separately and merged
  glofoxLocations: [
    {
      branchId: '67d9d5a8c2dce5404b08ef68',
      namespace: 'portalthermaculture',
      name: 'Minneapolis',
      timezone: 'America/Chicago',
      token: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJfIiwiZXhwIjoxNzg3MjE0NjQ3LCJpYXQiOjE3ODQ1MzYyNDcsImlzcyI6Il8iLCJ1c2VyIjp7Il9pZCI6Imd1ZXN0IiwibmFtZXNwYWNlIjoicG9ydGFsdGhlcm1hY3VsdHVyZSIsImJyYW5jaF9pZCI6IjY3ZDlkNWE4YzJkY2U1NDA0YjA4ZWY2OCIsImZpcnN0X25hbWUiOiJHdWVzdCIsImxhc3RfbmFtZSI6IlVzZXIiLCJ0eXBlIjoiR1VFU1QiLCJpc1N1cGVyQWRtaW4iOmZhbHNlfX0.MDND5QSpDBoUTw20g7HGcs2_kUo1Dz1-n5KceP4WnVI',
      tokenExpiry: '2026-08-20',
      operatingSince: '2025-01-01',
    },
  ],
} as const;

// Acuity Scheduling configuration (public scheduling widget API — no auth required)
//
// Two modes:
//   'class'   — group classes via POST /availability/class (e.g. Sauna Goose)
//   'service' — individual appointments via GET /availability/times (e.g. The Corner Sauna)
//
// Service-type venues must specify a `calendarId` on each appointment type
// because the GET endpoint queries one type+calendar pair at a time.
export interface AcuityConfig {
  /** 'class' (default) or 'service'. Determines which API endpoint to use. */
  mode?: 'class' | 'service';
  baseUrl: string;
  ownerKey: string;
  name: string;
  timezone: string;
  appointmentTypes: {
    id: number;
    name: string;
    duration: number;
    price: string;
    classSize: number;
    /** Required for service-type: which calendar to query this type against. */
    calendarId?: number;
  }[];
  calendarIds: number[];
}

export const ACUITY_CONFIG: Record<string, AcuityConfig> = {
  thecornersauna: {
    mode: 'service',
    baseUrl: 'https://app.squarespacescheduling.com',
    ownerKey: '6f7bfa9c',
    name: 'The Corner Sauna',
    timezone: 'Australia/Sydney',
    appointmentTypes: [
      { id: 71669392, name: 'Single Session', duration: 60, price: '40.00', classSize: 8, calendarId: 11172572 },
      { id: 80179076, name: "Women's Wellness Session", duration: 60, price: '40.00', classSize: 8, calendarId: 11172572 },
      { id: 86988395, name: 'Silent Sauna', duration: 60, price: '40.00', classSize: 8, calendarId: 13261360 },
    ],
    calendarIds: [11172572, 13261360],
  },
  saunagoose: {
    baseUrl: 'https://saunagoose.as.me',
    ownerKey: '1549c4c0',
    name: 'Sauna Goose',
    timezone: 'Australia/Melbourne',
    appointmentTypes: [
      { id: 69170578, name: 'Sauna Session', duration: 60, price: '25.55', classSize: 10 },
      { id: 83472539, name: 'Sauna Session', duration: 60, price: '25.55', classSize: 10 },
      { id: 69171187, name: 'Saunagus Session', duration: 60, price: '35.78', classSize: 10 },
      { id: 88489076, name: 'Saunagus Session', duration: 60, price: '35.78', classSize: 10 },
      { id: 88489132, name: 'Sauna Session', duration: 60, price: '25.55', classSize: 10 },
      { id: 89924672, name: 'Yoga & Saunagus', duration: 120, price: '66.50', classSize: 10 },
      { id: 89924356, name: "Men's Breathwork & Saunagus", duration: 120, price: '66.50', classSize: 10 },
      { id: 81434660, name: 'Femme Fridays', duration: 90, price: '56.25', classSize: 10 },
      { id: 85308919, name: 'Latvian Sauna', duration: 180, price: '97.50', classSize: 18 },
      { id: 87799529, name: 'Sunset Saunagus Session', duration: 60, price: '35.78', classSize: 10 },
    ],
    calendarIds: [
      12582797, 13267765, 12637053, 11913403, 12002100, 12953939, 13121171,
      13212786, 11872240, 11864080, 12473472, 12473476, 12473477, 13561145,
      12582798, 13505082, 12642771, 10841888, 11854765, 12513155,
    ],
  },
};

export function getAcuityConfig(hostId: string): AcuityConfig {
  const cfg = ACUITY_CONFIG[hostId];
  if (!cfg) throw new Error(`No Acuity config for hostId "${hostId}"`);
  return cfg;
}

// bsport configuration (public booking API — no auth required)
//
// KEEN Wellbeing (Zurich) runs on bsport (bsport.io). The public offer endpoint
// exposes full session history (back to 2024-11) including capacity (`effectif`)
// and booking counts (`validated_booking_count`) — fetched via date-range
// pagination like Momence.
//
// All public offers are included (matching the Momence/Glofox convention) —
// the venue regularly retires and introduces meta_activity IDs, so an activity
// allowlist would silently drop new class types. Only `manager_only` offers
// and excluded establishments (Mindbody-mirror placeholders with zero real
// bookings) are filtered out.
//
// Pricing on bsport is credit-based (1 credit per session), so `sessionPriceChf`
// carries a static per-visit rate derived from their website (10-pack CHF 270).
export interface BsportConfig {
  baseUrl: string;
  companyId: number;
  name: string;
  timezone: string;
  /** Earliest session date to fetch (first flagship session). */
  operatingSince: string;
  /** Static per-visit price in CHF (bsport bookings are credit-based). */
  sessionPriceChf: number;
  /** Establishment IDs to exclude (e.g. third-party booking mirrors). */
  excludedEstablishmentIds: number[];
  /** establishment ID → display name, used as the session `location`. */
  establishments: Record<number, string>;
}

export const BSPORT_CONFIG: Record<string, BsportConfig> = {
  keenwellbeing: {
    baseUrl: 'https://api.production.bsport.io/book/v1',
    companyId: 3385,
    name: 'KEEN Wellbeing',
    timezone: 'Europe/Zurich',
    operatingSince: '2024-11-23',
    sessionPriceChf: 27,
    // 12232 "MBO: KEEN Wellbeing" holds Mindbody-sync placeholder offers with
    // zero real bookings — excluding it keeps utilisation honest.
    excludedEstablishmentIds: [12232],
    establishments: {
      11743: 'KEEN Zurich',
      12232: 'MBO: KEEN Wellbeing',
      13598: 'KEEN Flagship: Treatment Room',
      14620: 'Josefwiese (Outdoor)',
      14621: 'Bootsvermietung Enge',
      17048: 'Sauna Utoquai',
      17851: 'Indigo Fitness Club Zürich',
      19791: 'Secret Location',
      20188: 'Samigo Sport Club',
    },
  },
};

export function getBsportConfig(hostId: string): BsportConfig {
  const cfg = BSPORT_CONFIG[hostId];
  if (!cfg) throw new Error(`No bsport config for hostId "${hostId}"`);
  return cfg;
}

// Hapana configuration (public widget API — security token required)
//
// Alchemy Saunas uses Hapana (hapana.com) as their booking platform.
// The widget API at widgetapi.hapana.com exposes session data including
// capacity and booking counts. Each location has its own widget ID (siteID).
//
// Data availability: ~2-3 months of historical data + future schedule.
// Past sessions are removed over time, so incremental caching is needed.
export interface HapanaLocation {
  widgetId: string;
  name: string;
  operatingSince: string;
  /** Flat drop-in price for this location (AUD). Alchemy prices by location, not by time. */
  dropInPrice: number;
  /** Unlimited weekly membership price for this location (AUD). */
  membershipWeekly: number;
}

export const HAPANA_CONFIG = {
  baseUrl: 'https://widgetapi.hapana.com/v2/wAPI/site/sessions',
  name: 'Alchemy Saunas',
  origin: 'https://alchemysaunas.com.au',
  timezone: 'Australia/Perth',
  // Security token is fetched dynamically from the settings endpoint per-location.
  // No hardcoded token needed — see hapanaClient.ts fetchSecurityToken().
  //
  // Static pricing — Hapana returns casualRate: 0 (credit-based), so we use website pricing.
  // Alchemy prices per LOCATION (not by time of day): premium/amenity sites $35 drop-in /
  // $40 week unlimited; beach & river sites $20 / $30. Confirmed 2026-07 from alchemysaunas.com.au.
  locations: [
    { widgetId: 'T204UER6NXhMbHQxemhCSTIxdDU2Zz09', name: 'Karrinyup', operatingSince: '2026-01-01', dropInPrice: 35, membershipWeekly: 40 },
    { widgetId: 'SlN0WjlHeitPRCtSd1h0K00yTmt3Zz09', name: 'Port Beach', operatingSince: '2025-01-01', dropInPrice: 20, membershipWeekly: 30 },
    { widgetId: 'bzNBYXpVMkNaT1ltdTcrZFlMSTlaUT09', name: 'Point Walter', operatingSince: '2025-01-01', dropInPrice: 20, membershipWeekly: 30 },
    { widgetId: 'MEZ6M1FsaXY2QUpEYkFLelpEQ254QT09', name: 'Fremantle', operatingSince: '2025-01-01', dropInPrice: 20, membershipWeekly: 30 },
    { widgetId: 'bzVBYmt0cm41S3h2WXhQZGdRVHE0Zz09', name: 'West Leederville', operatingSince: '2025-01-01', dropInPrice: 35, membershipWeekly: 40 },
    { widgetId: 'MTVjN0FsbmZMS0JhcVhzdGwvbUpDZz09', name: 'City Beach', operatingSince: '2025-01-01', dropInPrice: 20, membershipWeekly: 30 },
    { widgetId: 'a2Z6bVlFU2s4TEE4cmo0L3JIZHBqdz09', name: 'East Fremantle', operatingSince: '2025-01-01', dropInPrice: 35, membershipWeekly: 40 },
    { widgetId: 'dzBFdU1yRWxBQ2dwNktHVGFPM2dLUT09', name: 'Scarborough', operatingSince: '2025-01-01', dropInPrice: 35, membershipWeekly: 40 },
  ] as HapanaLocation[],
} as const;
