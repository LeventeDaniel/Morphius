export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS audit_events (
    id          TEXT PRIMARY KEY,
    timestamp   TEXT NOT NULL,
    source      TEXT NOT NULL,
    action      TEXT NOT NULL,
    payload     TEXT NOT NULL DEFAULT '{}',
    status      TEXT NOT NULL DEFAULT 'ok',
    session_id  TEXT NOT NULL DEFAULT 'default',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_audit_source ON audit_events(source);
  CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_events(session_id);
  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp DESC);

  CREATE TABLE IF NOT EXISTS plugin_state (
    plugin_id   TEXT PRIMARY KEY,
    enabled     INTEGER NOT NULL DEFAULT 1,
    config_json TEXT NOT NULL DEFAULT '{}',
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS session_metadata (
    session_id  TEXT PRIMARY KEY,
    recipe_id   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    last_active TEXT NOT NULL DEFAULT (datetime('now')),
    metadata    TEXT NOT NULL DEFAULT '{}'
  );
`;
