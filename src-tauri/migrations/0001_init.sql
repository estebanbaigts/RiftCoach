-- RiftCoach local schema, v1.
-- STATUS: designed, not wired yet. The demo build stores its small state in the webview
-- (namespaced, schema-validated). This schema will back the Rust storage layer (step 7)
-- once the Rust toolchain is part of CI. Demo and real data are separated by `origin`
-- and never queried together.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id                  TEXT NOT NULL,
  origin              TEXT NOT NULL CHECK (origin IN ('demo', 'riot-api', 'import')),
  played_at           TEXT NOT NULL,           -- ISO-8601
  duration_sec        INTEGER NOT NULL CHECK (duration_sec BETWEEN 60 AND 14400),
  queue               TEXT NOT NULL,
  champion            TEXT NOT NULL,
  role                TEXT,                    -- NULL for lane-less modes
  result              TEXT NOT NULL CHECK (result IN ('win', 'loss', 'remake')),
  kills               INTEGER NOT NULL CHECK (kills >= 0),
  deaths              INTEGER NOT NULL CHECK (deaths >= 0),
  assists             INTEGER NOT NULL CHECK (assists >= 0),
  cs                  INTEGER,                 -- NULL = not provided, never 0 by default
  vision_score        INTEGER,
  gold_earned         INTEGER,
  damage_to_champions INTEGER,
  team_kills          INTEGER,
  ingested_at         TEXT NOT NULL,
  PRIMARY KEY (origin, id)                     -- dedup per origin
);
CREATE INDEX IF NOT EXISTS idx_matches_origin_played ON matches (origin, played_at DESC);

CREATE TABLE IF NOT EXISTS goals (
  id            TEXT PRIMARY KEY,
  origin        TEXT NOT NULL CHECK (origin IN ('demo', 'riot-api', 'import')),
  insight_id    TEXT NOT NULL,
  metric        TEXT NOT NULL,
  comparator    TEXT NOT NULL CHECK (comparator IN ('atMost', 'atLeast')),
  target        REAL NOT NULL,
  horizon_games INTEGER NOT NULL CHECK (horizon_games BETWEEN 1 AND 100),
  baseline      REAL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- No table stores API keys: secrets belong in the OS keychain, never in SQLite.

INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
