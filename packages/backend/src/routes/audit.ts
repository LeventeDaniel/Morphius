import { Hono } from 'hono';
import { getDb } from '../db/client.js';
import type { AuditEvent } from '@morphius/core';

const app = new Hono();

// GET /api/audit — last N events, optionally filtered
app.get('/', (c) => {
  const db = getDb();
  const limit = Number(c.req.query('limit') ?? 100);
  const source = c.req.query('source');
  const sessionId = c.req.query('sessionId');

  let query = 'SELECT * FROM audit_events';
  const conditions: string[] = [];
  const params: Record<string, string | number> = { limit };

  if (source) {
    conditions.push('source = :source');
    params.source = source;
  }
  if (sessionId) {
    conditions.push('session_id = :sessionId');
    params.sessionId = sessionId;
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY timestamp DESC LIMIT :limit';

  const rows = db.prepare(query).all(params) as Array<Record<string, unknown>>;

  const events: AuditEvent[] = rows.map((row) => ({
    id: row.id as string,
    timestamp: row.timestamp as string,
    source: row.source as string,
    action: row.action as string,
    payload: JSON.parse((row.payload as string) || '{}'),
    status: row.status as AuditEvent['status'],
    sessionId: row.session_id as string,
  }));

  return c.json({ events, total: events.length });
});

// POST /api/audit — log an event
app.post('/', async (c) => {
  let body: Partial<AuditEvent> = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { source, action, payload, status = 'ok', sessionId = 'default' } = body;
  if (!source || !action) {
    return c.json({ error: 'Missing required fields: source, action' }, 400);
  }

  const db = getDb();
  const id = `audit-api-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = new Date().toISOString();

  db.prepare(
    `INSERT INTO audit_events (id, timestamp, source, action, payload, status, session_id)
     VALUES (:id, :timestamp, :source, :action, :payload, :status, :sessionId)`
  ).run({ id, timestamp, source, action, payload: JSON.stringify(payload ?? {}), status, sessionId });

  const event: AuditEvent = { id, timestamp, source, action, payload: payload ?? {}, status, sessionId };
  return c.json(event, 201);
});

export default app;
