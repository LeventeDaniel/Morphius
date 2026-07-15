// Host dispatch bridge — routes frontend action calls through Morphius_Host's runtime.
// Modules are loaded on first dispatch and kept in memory for the process lifetime.
// No files are copied or modified — Host require()s each backendEntry by absolute path.
// Uses createRequire pointed at shared deps so better-sqlite3 and other shared packages resolve.

import { Hono } from 'hono';
import { resolve, isAbsolute, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { globalRegistry } from '@morphius/core';

const app = new Hono();
const _thisDir = dirname(fileURLToPath(import.meta.url));

type ActionMap = Record<string, (...args: unknown[]) => unknown>;
type HostMod = { actions: ActionMap };

// Build a require function that resolves from the shared deps path so that
// module backendEntry files (e.g. host.ts) can find better-sqlite3 etc.
// Falls back to resolving from the backend package itself.
function makeRequire(entryPath: string): NodeRequire {
  // Try env var first, then fall back to known sibling location
  const sharedDeps = process.env.MORPHIUS_SHARED_DEPS_PATH
    ?? resolve(_thisDir, '../../../../..', 'Morphius_Dependencies', 'data', 'node_modules');
  if (existsSync(sharedDeps)) {
    // Sentinel must be one level above node_modules so createRequire finds packages inside it
    const sentinel = resolve(sharedDeps, '..', '_sentinel.js');
    return createRequire(sentinel);
  }
  return createRequire(entryPath);
}

const _modCache = new Map<string, HostMod>();

function loadMod(entryPath: string): HostMod | null {
  if (_modCache.has(entryPath)) return _modCache.get(entryPath)!;
  const _require = makeRequire(entryPath);
  const mod = _require(entryPath) as { actions?: ActionMap; default?: { actions?: ActionMap } };
  const actions = mod.actions ?? (mod.default as { actions?: ActionMap } | undefined)?.actions;
  if (!actions) return null;
  const result: HostMod = { actions };
  _modCache.set(entryPath, result);
  return result;
}

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

function getHost(): HostMod | null {
  ensureHostMounted();
  const hostManifest = globalRegistry.getManifest('morphius-host') as Record<string, unknown> | undefined;
  if (!hostManifest) return null;
  const folderPath = hostManifest._folderPath as string | undefined;
  const backendEntry = hostManifest.backendEntry as string | undefined;
  if (!folderPath || !backendEntry) return null;
  const entryPath = isAbsolute(backendEntry) ? backendEntry : resolve(folderPath, backendEntry);
  if (!existsSync(entryPath)) return null;
  const mod = loadMod(entryPath);
  if (!mod) return null;
  try { mod.actions.loadModule({ moduleId: 'morphius-host', backendEntryPath: entryPath }); } catch { /* already loaded */ }
  return mod;
}

// POST /api/host/load
app.post('/load', async (c) => {
  let body: { moduleId?: string } = {};
  try { body = await c.req.json(); } catch {
    return c.json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const { moduleId } = body;
  if (!moduleId) return c.json({ ok: false, error: 'Missing moduleId' }, 400);

  ensureHostMounted();
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

  // Special case: morphius-host bootstraps itself
  if (moduleId === 'morphius-host') {
    try {
      const mod = loadMod(entryPath);
      if (!mod) return c.json({ ok: false, error: 'morphius-host backendEntry exports no actions' }, 500);
      try { mod.actions.loadModule({ moduleId: 'morphius-host', backendEntryPath: entryPath }); } catch { /* already loaded */ }
      return c.json({ ok: true, moduleId, actions: Object.keys(mod.actions) });
    } catch (err) {
      return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  // All other modules: load via the Host runtime
  const host = getHost();
  if (!host) {
    return c.json({ ok: false, error: 'morphius-host must be loaded first' }, 503);
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
app.get('/restore', (c) => {
  const host = getHost();
  if (!host) {
    return c.json({ ok: false, surfaces: [], reason: 'host-not-mounted' });
  }

  try {
    const listRes = host.actions.dispatchAction({
      moduleId: 'morphius-state',
      action: 'listContexts',
      input: {},
    }) as { result?: { contexts?: Array<{ contextId: string; savedAt: string }> }; error?: string };

    if (listRes.error || !listRes.result?.contexts) {
      return c.json({ ok: false, surfaces: [], reason: listRes.error ?? 'no-contexts' });
    }

    const surfaces: Array<{ surfaceId: string; savedAt: string; payload: Record<string, unknown> }> = [];

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

// POST /api/host/bootstrap
app.post('/bootstrap', async (c) => {
  const siblingsDir = process.env.MORPHIUS_SIBLINGS_DIR ?? resolve(_thisDir, '../../../../..');

  const CORE_MODULES: Array<{ moduleId: string; repoDirName: string }> = [
    { moduleId: 'morphius-host',           repoDirName: 'Morphius_Host' },
    { moduleId: 'morphius-module-runtime', repoDirName: 'Morphius_ModuleRuntime' },
  ];

  const results: Array<{ moduleId: string; mounted: boolean; loaded: boolean; error?: string }> = [];

  for (const { moduleId, repoDirName } of CORE_MODULES) {
    const folderPath = resolve(siblingsDir, repoDirName, 'module');
    const manifestPath = resolve(folderPath, 'manifest.json');
    let mounted = !!globalRegistry.getManifest(moduleId);
    let loaded = false;
    let error: string | undefined;

    if (!mounted && existsSync(manifestPath)) {
      try {
        const raw = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
        raw._folderPath = folderPath;
        raw.source = 'external';
        raw.sourceLabel = folderPath;
        raw.manifestKind = 'module';
        globalRegistry.register(raw as unknown as Parameters<typeof globalRegistry.register>[0]);
        mounted = true;
      } catch (e) {
        error = `mount failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    if (mounted && !error) {
      try {
        const manifest = globalRegistry.getManifest(moduleId) as Record<string, unknown> | undefined;
        const backendEntry = manifest?.backendEntry as string | undefined;
        const fp = manifest?._folderPath as string | undefined;
        if (!backendEntry || !fp) throw new Error('no backendEntry in manifest');
        const entryPath = isAbsolute(backendEntry) ? backendEntry : resolve(fp, backendEntry);
        if (!existsSync(entryPath)) throw new Error(`entry not found: ${entryPath}`);

        if (moduleId === 'morphius-host') {
          const mod = loadMod(entryPath);
          if (!mod) throw new Error('could not load host backend — check console for errors');
          try { mod.actions.loadModule({ moduleId: 'morphius-host', backendEntryPath: entryPath }); } catch { /* already loaded */ }
          loaded = true;
        } else {
          const host = getHost();
          if (!host) throw new Error('morphius-host not loaded yet');
          const result = host.actions.loadModule({ moduleId, backendEntryPath: entryPath }) as { loaded: boolean; error?: string };
          if (!result.loaded) throw new Error(result.error ?? 'load failed');
          loaded = true;
        }
      } catch (e) {
        error = `load failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    results.push({ moduleId, mounted, loaded, ...(error ? { error } : {}) });
  }

  const allOk = results.every(r => r.loaded);
  return c.json({ ok: allOk, results, siblingsDir });
});

export default app;
