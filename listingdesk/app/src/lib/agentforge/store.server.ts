// D1-backed store for ListingDesk. The whole desk state lives as one JSON
// document in af_store, persisted in the website's D1 database.
import { bindings } from "../bindings.server";
import { buildSeed } from "./seed";
import type { DB } from "./types";

const KEY = "listingdesk-v11";

// In-memory fallback so the app still works if D1 is briefly unavailable
// during local dev (real deploys always have DB bound via app.manifest.json).
let memoryDb: DB | null = null;

export async function readDB(): Promise<DB> {
  const { DB: d1 } = bindings();
  if (!d1) {
    if (!memoryDb) memoryDb = buildSeed();
    return memoryDb;
  }
  const row = await d1
    .prepare("SELECT value FROM af_store WHERE key = ?")
    .bind(KEY)
    .first<{ value: string }>();
  if (row?.value) {
    const db = JSON.parse(row.value) as DB;
    const fresh = buildSeed();
    if (!db.owner) db.owner = fresh.owner;
    if (!db.social) db.social = fresh.social;
    if (!db.email) db.email = fresh.email;
    if (!db.site) db.site = fresh.site;
    if (!db.team) db.team = fresh.team;
    if (!db.ads) db.ads = fresh.ads;
    if (!db.billing) db.billing = fresh.billing;
    if (!db.channels) db.channels = fresh.channels;
    if (!db.campaigns) db.campaigns = fresh.campaigns;
    if (!db.leads) db.leads = fresh.leads;
    if (!db.clients) db.clients = fresh.clients;
    if (!db.posters) db.posters = fresh.posters;
    if (!db.messages) db.messages = fresh.messages;
    if (!db.settings) db.settings = fresh.settings;
    return db;
  }
  const seed = buildSeed();
  await writeDB(seed);
  return seed;
}

export async function writeDB(db: DB): Promise<void> {
  const { DB: d1 } = bindings();
  if (!d1) {
    memoryDb = db;
    return;
  }
  await d1
    .prepare(
      "INSERT INTO af_store (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(KEY, JSON.stringify(db))
    .run();
}

export async function updateDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const db = await readDB();
  const result = await fn(db);
  await writeDB(db);
  return result;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
