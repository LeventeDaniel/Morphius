import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Hono } from 'hono';
import { globalRegistry } from '@morphius/core';
import { auditLogger } from '@morphius/core';
import { getDb } from '../db/client.js';

const app = new Hono();

// Minimal validation — only the five required fields.
// Intentionally loose: accepts any module manifest regardless of which toolkit built it.
function validateModuleManifest(raw: unknown): { ok: boolean; error?: string; module?: Record<string, unknown> } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'manifest.json must be a JSON object' };
  const m = raw as Record<string, unknown>;
  for (const field of ['id', 'name', 'version', 'type', 'entry']) {
    if (typeof m[field] !== 'string' || !(m[field] as string).trim()) {
      return { ok: false, error: `manifest.json is missing required field: "${field}"` };
    }
  }
  if (!/^\d+\.\d+\.\d+$/.test(m.version as string)) {
    return { ok: false, error: 'version must be semver (e.g. 1.0.0)' };
  }
  return { ok: true, module: m };
}

// GET /api/plugins — list all manifests
app.get('/', (c) => {
  const manifests = globalRegistry.listManifests();
  return c.json({ plugins: manifests, total: manifests.length });
});

// GET /api/plugins/:id — get single manifest
app.get('/:id', (c) => {
  const id = c.req.param('id');
  const manifest = globalRegistry.getManifest(id);
  if (!manifest) {
    return c.json({ error: `Plugin "${id}" not found` }, 404);
  }
  return c.json(manifest);
});

// POST /api/plugins/mount — register a module from a folder path (metadata only, no file copying)
// Accepts: the module folder itself, or a parent folder containing a module/ subfolder
app.post('/mount', async (c) => {
  let body: { path?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const folderPath = body.path?.trim();
  if (!folderPath) {
    return c.json({ ok: false, error: 'Missing "path" field' }, 400);
  }

  const absPath = resolve(folderPath);
  if (!existsSync(absPath)) {
    return c.json({ ok: false, error: 'Path does not exist' }, 400);
  }

  // Check manifest.json at root, then fall back to <folder>/module/manifest.json
  let manifestPath = join(absPath, 'manifest.json');
  let moduleRoot = absPath;
  if (!existsSync(manifestPath)) {
    const subPath = join(absPath, 'module', 'manifest.json');
    if (existsSync(subPath)) {
      manifestPath = subPath;
      moduleRoot = join(absPath, 'module');
    } else {
      return c.json({ ok: false, error: 'No manifest.json found — checked folder root and module/ subfolder' }, 400);
    }
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    return c.json({ ok: false, error: `manifest.json is not valid JSON: ${err instanceof Error ? err.message : err}` }, 400);
  }

  const validation = validateModuleManifest(raw);
  if (!validation.ok || !validation.module) {
    return c.json({ ok: false, error: validation.error ?? 'Invalid manifest', warnings: [] }, 400);
  }

  validation.module._folderPath = moduleRoot;

  globalRegistry.register(validation.module as any);

  return c.json({
    ok: true,
    module: validation.module,
    warnings: [],
  });
});

// POST /api/plugins/:id/run — execute a plugin action
app.post('/:id/run', async (c) => {
  const id = c.req.param('id');
  const manifest = globalRegistry.getManifest(id);

  if (!manifest) {
    return c.json({ error: `Plugin "${id}" not found` }, 404);
  }

  let body: { action?: string; input?: unknown } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { action, input } = body;
  if (!action) {
    return c.json({ error: 'Missing "action" field' }, 400);
  }

  const actionDef = (manifest as any).actions?.find((a: any) => a.id === action);
  if (!actionDef) {
    return c.json({ error: `Action "${action}" not found in plugin "${id}"` }, 400);
  }

  await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

  const result = {
    pluginId: id,
    action,
    input,
    output: {
      mock: true,
      message: `Mock output from ${(manifest as any).name} → ${actionDef.name}`,
      timestamp: new Date().toISOString(),
    },
    executedAt: new Date().toISOString(),
  };

  const db = getDb();
  const eventId = `audit-run-${Date.now()}`;
  db.prepare(
    `INSERT INTO audit_events (id, timestamp, source, action, payload, status, session_id)
     VALUES (:id, :timestamp, :source, :action, :payload, :status, :sessionId)`
  ).run({
    id: eventId,
    timestamp: new Date().toISOString(),
    source: id,
    action,
    payload: JSON.stringify({ input, output: result.output }),
    status: 'ok',
    sessionId: 'default',
  });

  auditLogger.log(id, action, { input, output: result.output }, 'ok');

  return c.json(result);
});

export default app;
