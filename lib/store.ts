import { promises as fs } from "fs";
import path from "path";
import { DB } from "./types";
import { buildSeed } from "./seed";

// Simple JSON-file store. Good enough for a single-instance v1; swap for
// Postgres/SQLite when multi-user auth lands.
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

let writeQueue: Promise<unknown> = Promise.resolve();

export async function readDB(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    const seed = buildSeed();
    await writeDB(seed);
    return seed;
  }
}

export async function writeDB(db: DB): Promise<void> {
  // Serialize writes so concurrent API routes don't interleave file writes.
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = DB_PATH + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, DB_PATH);
  });
  await writeQueue;
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
