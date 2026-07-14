// Host dispatch bridge — routes frontend action calls through Morphius_Host's runtime.
// Modules are loaded on first dispatch and kept in memory for the process lifetime.
// No files are copied or modified — Host just require()s each backendEntry by absolute path.

import { Hono } from 'hono';
import { resolve, isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { globalRegistry } from '@morphius/core';

const app = new Hono();

// CJS require rooted at this backend package so Node resolves shared deps
// (better-sqlite3, etc.) from Morphius/node_modules which are pre-installed.
const _require = createRequire(import.meta.url);

// Lazy-load Host so the backend starts even if Morphius_Host isn't loaded yet.
// Returns null if Host hasn't been mounted yet.
function getHost(): { actions: Record<string, (...args: unknown[]) => unknown> } | null {
  try {
    const hostManifest = globalRegistry.getManifest('morphius-host') as Record<string, unknown> | undefined;
    if (!hostManifest) return null;
    const folderPath = hostManifest._folderPath as string | undefined;
    if (!folderPath) return null;
    const backendEntry = hostManifest.backendEntry as string | undefined;
    if (!backendEntry) return null;
    const entryPath = isAbsolute(backendEntry)
      ? backendEntry
      : resolve(folderPath, backendEntry);
    if (!existsSync(entryPath)) return null;
    const mod = _require(entryPath) as { actions?: Record<string, (...args: unknown[]) => unknown> };
    return mod.actions ? { actions: mod.actions } : null;
  } catch {
    return null;
  }
}

// POST /api/host/load
// Loads a module's backendEntry into the Host runtime.
// Special case: loading morphius-host itself bootstraps the runtime.
// All other modules are loaded via host.actions.loadModule after Host is ready.
app.post('/load', async (c) => {
  let body: { moduleId?: string } = {};
  try { body = await c.req.json(); } catch {
    return c.json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const { moduleId } = body;
  if (!moduleId) return c.json({ ok: false, error: 'Missing moduleId' }, 400);

  const manifest = globalRegistry.getManifest(moduleId) as Record<string, unknown> | undefined;
  if (!manifest) {
    return c.json({ ok: false, error: `Module "${moduleId}" not found in registry — mount it first via the + button` }, 404);
  }

  const folderPath   = manifest._folderPath  as string | undefined;
  const backendEntry = manifest.backendEntry as string | undefined;
  if (!folderPath || !backendEntry) {
    return c.json({ ok: false, error: `Module "${moduleId}" has no backendEntry — metadata-only module` }, 400);
  }

  const entryPath = isAbsolute(backendEntry) ? backendEntry : resolve(folderPath, backendEntry);
  if (!existsSync(entryPath)) {
    return c.json({ ok: false, error: `backendEntry not found: ${entryPath}` }, 400);
  }

  // Special case: morphius-host bootstraps itself — require() it directly.
  // After this, getHost() will return the live runtime for all other modules.
  if (moduleId === 'morphius-host') {
    try {
      const mod = _require(entryPath) as { actions?: Record<string, (...args: unknown[]) => unknown> };
      if (!mod.actions) return c.json({ ok: false, error: 'morphius-host backendEntry exports no actions' }, 500);
      // Self-register so Host knows about itself (needed for isLoaded probes)
      mod.actions.loadModule({ moduleId: 'morphius-host', backendEntryPath: entryPath });
      return c.json({ ok: true, moduleId, actions: Object.keys(mod.actions) });
    } catch (err) {
      return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  // All other modules: load via the Host runtime
  const host = getHost();
  if (!host) {
    return c.json({ ok: false, error: 'morphius-host must be loaded first — open its window first' }, 503);
  }

  try {
    const result = host.actions.loadModule({ moduleId, backendEntryPath: entryPath }) as { loaded: boolean; actions: string[]; error?: string };
    if (!result.loaded) {
      return c.json({ ok: false, error: result.error ?? 'Load failed' }, 500);
    }
    return c.json({ ok: true, moduleId, actions: result.actions });
  } catch (err) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// POST /api/host/dispatch
// Dispatches an action on a loaded module through the Host runtime.
// Body: { moduleId: string, action: string, input?: object }
app.post('/dispatch', async (c) => {
  let body: { moduleId?: string; action?: string; input?: Record<string, unknown> } = {};
  try { body = await c.req.json(); } catch {
    return c.json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const { moduleId, action, input = {} } = body;
  if (!moduleId) return c.json({ ok: false, error: 'Missing moduleId' }, 400);
  if (!action)   return c.json({ ok: false, error: 'Missing action' }, 400);

  const host = getHost();
  if (!host) {
    return c.json({ ok: false, error: 'morphius-host is not mounted' }, 503);
  }

  try {
    const result = host.actions.dispatchAction({ moduleId, action, input }) as {
      result?: unknown;
      durationMs: number;
      error?: string;
    };
    if (result.error) {
      return c.json({ ok: false, error: result.error, durationMs: result.durationMs }, 400);
    }
    return c.json({ ok: true, result: result.result, durationMs: result.durationMs });
  } catch (err) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// GET /api/host/status
// Returns which modules are currently loaded in the Host runtime.
app.get('/status', (c) => {
  const host = getHost();
  if (!host) {
    return c.json({ ok: false, hostMounted: false, modules: [] });
  }
  try {
    const status = host.actions.listModules() as { modules: Array<{ moduleId: string; actions: string[] }> };
    return c.json({ ok: true, hostMounted: true, modules: status.modules ?? [] });
  } catch {
    return c.json({ ok: true, hostMounted: true, modules: [] });
  }
});

// GET /api/host/restore
// Returns all saved surface states from morphius-state so the canvas can
// rehydrate the window layout on startup.
// Each entry contains the surfaceId, last known position/size, moduleId,
// folderPath, and contentKind — everything the canvas needs to reopen windows.
app.get('/restore', (c) => {
  const host = getHost();
  if (!host) {
    return c.json({ ok: false, surfaces: [], reason: 'host-not-mounted' });
  }

  try {
    // Ask Host to dispatch listContexts on morphius-state
    const listRes = host.actions.dispatchAction({
      moduleId: 'morphius-state',
      action: 'listContexts',
      input: {},
    }) as { result?: { contexts?: Array<{ contextId: string; savedAt: string }> }; error?: string };

    if (listRes.error || !listRes.result?.contexts) {
      return c.json({ ok: false, surfaces: [], reason: listRes.error ?? 'no-contexts' });
    }

    const surfaces: Array<{
      surfaceId: string;
      savedAt: string;
      payload: Record<string, unknown>;
    }> = [];

    for (const ctx of listRes.result.contexts) {
      const loadRes = host.actions.dispatchAction({
        moduleId: 'morphius-state',
        action: 'loadState',
        input: { contextId: ctx.contextId },
      }) as { result?: { contextId: string; payload: Record<string, unknown>; savedAt: string } | null; error?: string };

      if (!loadRes.error && loadRes.result?.payload) {
        surfaces.push({
          surfaceId: ctx.contextId,
          savedAt: loadRes.result.savedAt,
          payload: loadRes.result.payload,
        });
      }
    }

    return c.json({ ok: true, surfaces });
  } catch (err) {
    return c.json({ ok: false, surfaces: [], reason: err instanceof Error ? err.message : String(err) });
  }
});

export default app;
