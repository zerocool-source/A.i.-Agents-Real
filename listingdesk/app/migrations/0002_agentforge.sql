-- AgentForge document store: one JSON blob per collection snapshot.
-- Additive only — shared by preview + production.
CREATE TABLE IF NOT EXISTS af_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
