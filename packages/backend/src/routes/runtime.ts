// Module Runtime bridge — serves bundles and iframe HTML for module frontend execution.
// Requires morphius-module-runtime to be loaded via Host before any bundle routes work.

import { Hono } from 'hono';
import { resolve, isAbsolute, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { globalRegistry } from '@morphius/core';

const app = new Hono();

// Navigate from packages/backend/src/routes/ up to the Morphius workspace root node_modules
const _thisDir = dirname(fileURLToPath(import.meta.url));
const _morphiusRoot = resolve(_thisDir, '../../../../');
const REACT_UMD = resolve(_morphiusRoot, 'node_modules/react/umd/react.development.js');
const REACT_DOM_UMD = resolve(_morphiusRoot, 'node_modules/react-dom/umd/react-dom.development.js');

type ActionMap = Record<string, (...args: unknown[]) => unknown>;

function makeRequire(entryPath: string): NodeRequire {
  const sharedDeps = process.env.MORPHIUS_SHARED_DEPS_PATH
    ?? resolve(_thisDir, '../../../../..', 'Morphius_Dependencies', 'data', 'node_modules');
  if (existsSync(sharedDeps)) {
    const sentinel = resolve(sharedDeps, '..', '_sentinel.js');
    return createRequire(sentinel);
  }
  return createRequire(entryPath);
}

// ─── Vendor routes — React served once from Morphius, never bundled per-module ──

app.get('/vendor/react.js', (c) => {
  if (!existsSync(REACT_UMD)) {
    return c.text('// react not found in Morphius node_modules', 500);
  }
  const js = readFileSync(REACT_UMD, 'utf-8');
  return c.text(js, 200, { 'Content-Type': 'application/javascript' });
});

app.get('/vendor/react-dom.js', (c) => {
  if (!existsSync(REACT_DOM_UMD)) {
    return c.text('// react-dom not found in Morphius node_modules', 500);
  }
  const js = readFileSync(REACT_DOM_UMD, 'utf-8');
  return c.text(js, 200, { 'Content-Type': 'application/javascript' });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureHostMounted(): void {
  if (globalRegistry.getManifest('morphius-host')) return;
  const siblingsDir = process.env.MORPHIUS_SIBLINGS_DIR ?? resolve(_thisDir, '../../../../..');
  const folderPath = resolve(siblingsDir, 'Morphius_Host', 'module');
  const manifestPath = resolve(folderPath, 'manifest.json');
  if (!existsSync(manifestPath)) return;
  try {
    const raw = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
    raw._folderPath = folderPath;
    raw.source = 'external';
    raw.sourceLabel = folderPath;
    raw.manifestKind = 'module';
    globalRegistry.register(raw as unknown as Parameters<typeof globalRegistry.register>[0]);
  } catch { /* ignore */ }
}

function getHost(): { actions: ActionMap } | null {
  ensureHostMounted();
  const hostManifest = globalRegistry.getManifest('morphius-host') as Record<string, unknown> | undefined;
  if (!hostManifest) return null;
  const folderPath = hostManifest._folderPath as string | undefined;
  const backendEntry = hostManifest.backendEntry as string | undefined;
  if (!folderPath || !backendEntry) return null;
  const entryPath = isAbsolute(backendEntry) ? backendEntry : resolve(folderPath, backendEntry);
  if (!existsSync(entryPath)) return null;
  try {
    const mod = makeRequire(entryPath)(entryPath) as { actions?: ActionMap };
    if (!mod.actions) return null;
    try { mod.actions.loadModule({ moduleId: 'morphius-host', backendEntryPath: entryPath }); } catch { /* already loaded */ }
    return { actions: mod.actions };
  } catch { return null; }
}

function getRuntimeBackend(): { actions: ActionMap; generateIframeHtml: (moduleId: string, bundleUrl: string, meta?: { name?: string; description?: string }) => string } | null {
  const manifest = globalRegistry.getManifest('morphius-module-runtime') as Record<string, unknown> | undefined;
  if (!manifest) return null;
  const folderPath = manifest._folderPath as string | undefined;
  const backendEntry = manifest.backendEntry as string | undefined;
  if (!folderPath || !backendEntry) return null;
  const entryPath = isAbsolute(backendEntry) ? backendEntry : resolve(folderPath, backendEntry);
  if (!existsSync(entryPath)) return null;
  try {
    const mod = makeRequire(entryPath)(entryPath) as { actions?: ActionMap; generateIframeHtml?: (moduleId: string, bundleUrl: string) => string };
    if (!mod.actions) return null;
    return {
      actions: mod.actions,
      generateIframeHtml: mod.generateIframeHtml ?? ((_id: string, _url: string) => '<html><body>runtime not available</body></html>'),
    };
  } catch { return null; }
}

// ─── GET /api/runtime/status ──────────────────────────────────────────────────

app.get('/status', (c) => {
  const runtime = getRuntimeBackend();
  if (!runtime) return c.json({ ok: false, runtimeLoaded: false, bundleCount: 0 });
  try {
    const status = runtime.actions.getStatus() as { bundleCount: number; bundles: unknown[] };
    return c.json({ ok: true, runtimeLoaded: true, bundleCount: status.bundleCount, bundles: status.bundles });
  } catch { return c.json({ ok: false, runtimeLoaded: false, bundleCount: 0 }); }
});

// ─── POST /api/runtime/build ──────────────────────────────────────────────────
// Body: { moduleId }
// Looks up the module in the registry, finds its entry path and folder, triggers build.

app.post('/build', async (c) => {
  let body: { moduleId?: string; force?: boolean } = {};
  try { body = await c.req.json(); } catch {
    return c.json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const { moduleId, force } = body;
  if (!moduleId) return c.json({ ok: false, error: 'Missing moduleId' }, 400);

  const manifest = globalRegistry.getManifest(moduleId) as Record<string, unknown> | undefined;
  if (!manifest) return c.json({ ok: false, error: `Module "${moduleId}" not found — mount it first` }, 404);

  const folderPath = manifest._folderPath as string | undefined;
  const entry = manifest.entry as string | undefined;
  if (!folderPath || !entry) return c.json({ ok: false, error: `Module "${moduleId}" has no entry file` }, 400);

  const entryPath = isAbsolute(entry) ? entry : resolve(folderPath, entry);
  if (!existsSync(entryPath)) return c.json({ ok: false, error: `entry not found: ${entryPath}` }, 400);

  const runtime = getRuntimeBackend();
  if (!runtime) return c.json({ ok: false, error: 'morphius-module-runtime is not loaded — load it first via Host' }, 503);

  try {
    const result = await (runtime.actions.buildBundle as (input: unknown) => Promise<unknown>)({
      moduleId,
      entryPath,
      moduleFolder: folderPath,
      force: force ?? false,
    }) as { built: boolean; sizeBytes: number; cached: boolean; error?: string };

    if (!result.built) return c.json({ ok: false, error: result.error ?? 'Build failed' }, 500);
    return c.json({ ok: true, moduleId, sizeBytes: result.sizeBytes, cached: result.cached });
  } catch (err) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// ─── GET /api/runtime/bundle/:moduleId ────────────────────────────────────────
// Serves the compiled JS bundle for a module.

app.get('/bundle/:moduleId', async (c) => {
  const moduleId = c.req.param('moduleId');

  const runtime = getRuntimeBackend();
  if (!runtime) return c.text('// runtime not loaded', 503);

  // Auto-build if not cached
  const manifest = globalRegistry.getManifest(moduleId) as Record<string, unknown> | undefined;
  if (manifest) {
    const folderPath = manifest._folderPath as string | undefined;
    const entry = manifest.entry as string | undefined;
    if (folderPath && entry) {
      const entryPath = isAbsolute(entry) ? entry : resolve(folderPath, entry);
      if (existsSync(entryPath)) {
        await (runtime.actions.buildBundle as (input: unknown) => Promise<unknown>)({
          moduleId, entryPath, moduleFolder: folderPath,
        });
      }
    }
  }

  // Serve the bundle file directly from the runtime's data dir
  const status = runtime.actions.getStatus() as { dataPath: string };
  const { dataPath } = status;
  const bundleFile = `${dataPath}/${moduleId}.js`;

  if (!existsSync(bundleFile)) {
    return c.text(`// bundle not found for ${moduleId}`, 404);
  }

  const js = readFileSync(bundleFile, 'utf-8');
  return c.text(js, 200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
});

// ─── GET /api/runtime/iframe/:moduleId ────────────────────────────────────────
// Serves the iframe HTML wrapper for a module. The iframe loads the bundle and
// sets up the callAction postMessage bridge.

app.get('/iframe/:moduleId', (c) => {
  const moduleId = c.req.param('moduleId');
  const runtime = getRuntimeBackend();
  if (!runtime) {
    return c.html('<html><body style="background:#111;color:#f87171;font-family:monospace;padding:12px">ModuleRuntime not loaded</body></html>');
  }

  const manifest = globalRegistry.getManifest(moduleId) as Record<string, unknown> | undefined;
  const bust = Date.now();
  const bundleUrl = `/api/runtime/bundle/${moduleId}?t=${bust}`;
  const html = runtime.generateIframeHtml(moduleId, bundleUrl, {
    name: manifest?.name as string | undefined,
    description: manifest?.description as string | undefined,
  });
  return c.html(html, 200, {
    'Cache-Control': 'no-store',
  });
});

// ─── POST /api/runtime/relay ──────────────────────────────────────────────────
// Relays a callAction postMessage from an iframe to the Host dispatch.
// Body: { moduleId, action, input, requestId }
// The iframe postMessage handler in the Morphius frontend calls this.

app.post('/relay', async (c) => {
  let body: { moduleId?: string; action?: string; input?: Record<string, unknown>; requestId?: string } = {};
  try { body = await c.req.json(); } catch {
    return c.json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const { moduleId, action, input = {}, requestId } = body;
  if (!moduleId || !action || !requestId) {
    return c.json({ ok: false, error: 'Missing moduleId, action, or requestId' }, 400);
  }

  const host = getHost();
  if (!host) return c.json({ ok: false, error: 'Host not loaded', requestId }, 503);

  try {
    const result = host.actions.dispatchAction({ moduleId, action, input }) as {
      result?: unknown; durationMs: number; error?: string;
    };
    if (result.error) {
      return c.json({ ok: false, error: result.error, requestId, durationMs: result.durationMs });
    }
    return c.json({ ok: true, result: result.result, requestId, durationMs: result.durationMs });
  } catch (err) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : String(err), requestId }, 500);
  }
});

export default app;
