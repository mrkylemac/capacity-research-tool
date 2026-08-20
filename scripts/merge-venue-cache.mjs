#!/usr/bin/env node
/**
 * Git merge driver for the venue cache files.
 *
 * These files are written by the polling workflow every 15 minutes and by
 * `yarn poll:*` locally, so two sides diverge constantly. The default text
 * merge writes conflict markers into the JSON, which silently corrupts a venue
 * cache — that happened twice on 2026-08-16, once in the Acuity and TryBe
 * caches and once in Navia's.
 *
 * `merge=ours` was the previous declaration and is worse than it looks: it
 * keeps the local copy and discards whatever the other side had, which for a
 * cache that only ever accumulates means throwing away real history. Several of
 * these platforms cannot re-fetch the past, so a dropped past session is gone.
 *
 * This driver unions instead. The rule it enforces is the one the pollers
 * already enforce internally: a session that has already run must never
 * disappear. Future sessions come from whichever side observed last, so a
 * cancelled day still self-corrects.
 *
 * Registered by `yarn cache:setup`. Git invokes it as:
 *   merge-venue-cache.mjs %O %A %B %P
 * where %O is the common ancestor, %A is our version AND the output path, %B is
 * theirs, and %P the real pathname. Exit 0 means resolved, 1 means conflict.
 */

import fs from 'node:fs';

const [, , , ourPath, theirPath, pathName = ''] = process.argv;

function read(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

const ours = read(ourPath);
const theirs = read(theirPath);

// If either side will not parse, refuse rather than guess. Git falls back to a
// normal conflict and a human looks at it.
if (!ours || !theirs) {
  console.error(`merge-venue-cache: ${pathName} — a side did not parse, leaving it as a conflict`);
  process.exit(1);
}

const newer = (a, b) => (String(a ?? '') >= String(b ?? '') ? 'ours' : 'theirs');

let merged;

if (Array.isArray(ours.sessions) && Array.isArray(theirs.sessions)) {
  // Session cache. Union by id; where both hold the same session, take the one
  // observed most recently.
  const win = newer(ours.cachedAt, theirs.cachedAt);
  const first = win === 'ours' ? theirs.sessions : ours.sessions;
  const second = win === 'ours' ? ours.sessions : theirs.sessions;

  const byId = new Map();
  for (const s of first) byId.set(s.id, s);
  for (const s of second) byId.set(s.id, s);

  const sessions = [...byId.values()].sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
  const base = win === 'ours' ? ours : theirs;

  merged = {
    ...base,
    cachedAt: win === 'ours' ? ours.cachedAt : theirs.cachedAt,
    sessions,
    dateRange: sessions.length
      ? { from: sessions[0].startsAt, to: sessions[sessions.length - 1].startsAt }
      : base.dateRange,
  };

  const gained = sessions.length - Math.max(ours.sessions.length, theirs.sessions.length);
  console.error(
    `merge-venue-cache: ${pathName} — ${ours.sessions.length} + ${theirs.sessions.length} ` +
    `-> ${sessions.length} sessions (${gained >= 0 ? '+' : ''}${gained} vs the larger side)`,
  );
} else if (ours.entries && theirs.entries) {
  // Entry ledger (Navia). Same idea, keyed on the entry key, newest observation
  // of each entry wins.
  const entries = { ...theirs.entries };
  for (const [k, v] of Object.entries(ours.entries)) {
    const prev = entries[k];
    if (!prev || String(v.observedAt ?? '') >= String(prev.observedAt ?? '')) entries[k] = v;
  }
  merged = {
    refreshedAt: newer(ours.refreshedAt, theirs.refreshedAt) === 'ours' ? ours.refreshedAt : theirs.refreshedAt,
    entries,
  };
  console.error(
    `merge-venue-cache: ${pathName} — ledger ${Object.keys(ours.entries).length} + ` +
    `${Object.keys(theirs.entries).length} -> ${Object.keys(entries).length} entries`,
  );
} else {
  console.error(`merge-venue-cache: ${pathName} — unrecognised shape, leaving it as a conflict`);
  process.exit(1);
}

fs.writeFileSync(ourPath, JSON.stringify(merged, null, 2), 'utf-8');
process.exit(0);
