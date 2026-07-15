# Morphius Plugin Guide

This guide covers everything you need to build a plugin for Morphius.

---

## Forge UI Rules

These rules apply to every module UI (`module.tsx`). They are non-negotiable.

### Never display a module ID to the user

Module IDs (`morphius-host`, `morphius-module-runtime`, etc.) are internal identifiers — they must never appear in any UI surface. Always resolve to the human `name` from the manifest.

**Authoritative name source: Host's `listModules` action.** Host reads `manifest.json` at load time and returns `name` alongside `moduleId`. This covers all loaded modules regardless of whether they appear in the plugin registry.

**If your module receives `name` directly from the backend** (e.g. `listModules` already returns it), use it directly — no extra fetch needed.

**If your module needs to resolve names for arbitrary IDs**, use this two-tier pattern:

```ts
// Tier 1: Host's listModules (reads manifest.json, covers all loaded modules)
async function fetchHostNameMap(): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/host/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: 'morphius-host', action: 'listModules', input: {} }),
    });
    if (res.ok) {
      const json = await res.json() as { result?: { modules?: Array<{ moduleId: string; name: string }> } };
      return Object.fromEntries((json.result?.modules ?? []).map(m => [m.moduleId, m.name]));
    }
  } catch { /* ignore */ }
  return {};
}

async function resolveModuleNames(ids: string[]): Promise<Record<string, string>> {
  const hostMap = await fetchHostNameMap();
  // Fallback to plugin registry for IDs not in host map
  const missing = ids.filter(id => !hostMap[id]);
  const fallbacks = await Promise.all(
    missing.map(async (id) => {
      try {
        const res = await fetch(`/api/plugins/${id}`);
        if (res.ok) {
          const m = await res.json() as { name?: string };
          return [id, m.name ?? id] as const;
        }
      } catch { /* ignore */ }
      return [id, id] as const;
    })
  );
  return { ...Object.fromEntries(fallbacks), ...hostMap };
}
```

Store the result in a `nameMap` state, then display `nameMap[moduleId] ?? moduleId` everywhere. The fallback ensures nothing breaks if the API is unreachable.

### Colors

- Single accent color: `#4ade80` (lime-green). No red, blue, or other accents.
- Red (`#f87171`) is allowed **only** for error states (error dot, error text in `<pre>`).
- All other colors from the palette: `#111` bg, `#181818` alt, `#2a2a2a` border, `#e0e0e0` text, `#aaa` dim, `#666` label.

### Font

- Always `var(--font-mono)`. Never hardcode `monospace`, `'JetBrains Mono'`, or any other font.

### No rounded corners

- Never use `borderRadius` on any element.

### Buttons

- `background: #1e1e1e`, `color: #ccc`, `border: 1px solid #2a2a2a`, `padding: 5px 14px`, `font-family: var(--font-mono)`, `font-size: 12px`, `text-transform: uppercase`, `letter-spacing: 0.1em`, `cursor: pointer`.
- Destructive button variant: same but `color: #4ade80`, `border-color: #1a2a1a`.

---

## 1. Plugin Manifest Contract

Every plugin must have a `manifest.json` at its root. The full type is defined in `packages/core/src/plugin/manifest.ts`.

### All fields explained

```json
{
  "id": "my-plugin",                  // REQUIRED. kebab-case, unique across all plugins
  "name": "My Plugin",               // REQUIRED. Display name
  "description": "What it does",     // REQUIRED. Short description
  "version": "1.0.0",                // REQUIRED. Semver

  "capabilities": ["search", "fetch"],  // What the plugin can do (free-form tags)
  "permissions": ["network", "storage"], // What system resources it needs

  // JSON Schema for plugin-level input/output/config
  "inputSchema": { "type": "object", "properties": { ... } },
  "outputSchema": { "type": "object", "properties": { ... } },
  "configSchema": { "type": "object", "properties": { ... } },

  // Action definitions — each action is callable via POST /api/plugins/:id/run
  "actions": [
    {
      "id": "search",             // Unique within this plugin
      "name": "Search",
      "description": "Search for something",
      "inputSchema": { "type": "object", "properties": { "query": { "type": "string" } } },
      "outputSchema": { "type": "object", "properties": { "results": { "type": "array" } } }
    }
  ],

  // UI blocks — each block is a panel slot in the workspace canvas
  "uiBlocks": [
    {
      "id": "main-panel",          // Unique within this plugin
      "name": "Main Panel",
      "role": "primary",           // primary | sidebar | panel | chip | overlay
      "minWidth": 300,             // optional, pixels
      "minHeight": 200             // optional, pixels
    }
  ],

  // Events this plugin fires (EventBus publish)
  "emits": ["search.complete", "search.error"],

  // Events this plugin listens to (EventBus subscribe)
  "listensTo": ["user.search"],

  "standaloneMode": true,          // Can run without the main app shell
  "mainAppIntegration": true       // Integrates with the main Morphius shell
}
```

### Validation

The manifest is validated with Zod on startup. Invalid manifests are skipped with a warning. Run the backend and check console output to diagnose manifest errors.

---

## 2. Implementing the Plugin Handler

Create `src/index.ts` with a default export:

```ts
// src/index.ts
export default async function handler(
  action: string,
  input: unknown
): Promise<unknown> {
  if (action === 'search') {
    const { query } = input as { query: string };
    // ... your logic
    return { results: [], total: 0 };
  }

  if (action === 'fetch') {
    // ...
  }

  throw new Error(`Unknown action: ${action}`);
}
```

**Rules:**
- The function receives the `action` string (must match an `id` in your manifest's `actions` array) and the raw `input` object from the API request.
- Return any JSON-serializable value.
- Throw an Error to signal failure — the backend will catch it and return a 500.
- Simulate real latency in mock mode: `await new Promise(r => setTimeout(r, 150 + Math.random() * 200))`

---

## 3. Adding UI Blocks

UI blocks are rendered by `packages/frontend/src/plugins/PluginBlock.tsx`. Each block slot:
- Receives the `pluginId` and `blockId` as props
- Calls `api.plugins.run(pluginId, action, input)` to execute actions
- Displays output inline

**Roles:**
| Role | Canvas use |
|---|---|
| `primary` | Main content area of a panel |
| `sidebar` | Narrow context drawer |
| `panel` | Standard panel block |
| `chip` | Compact status indicator in status bar |
| `overlay` | Full-screen overlay |

To create a custom React component for your block, extend `PluginBlock.tsx` to check for your `pluginId` and `blockId` and render a custom component instead of the default generic UI.

---

## 4. Registering the Plugin

Place your plugin directory inside `plugins/` (or the directory configured by `MORPHIUS_PLUGINS_DIR`):

```
plugins/
  my-plugin/
    manifest.json
    package.json
    src/
      index.ts
```

The backend scans this directory on startup. No manual registration step is needed — the loader discovers any directory containing a valid `manifest.json`.

To verify your plugin loaded, call:
```
GET http://localhost:7900/api/plugins
```

---

## 5. Writing a Workspace Recipe

Create a `.recipe.json` file in `recipes/`:

```json
{
  "id": "my-mode",
  "name": "My Mode",
  "description": "Custom workspace for my task",
  "requiredPlugins": ["my-plugin", "mock-audit-logger"],
  "layout": "split",
  "defaultPanels": [
    {
      "id": "main",
      "pluginId": "my-plugin",
      "blockId": "main-panel",
      "position": { "col": 1, "row": 1, "colSpan": 8, "rowSpan": 10 }
    },
    {
      "id": "audit",
      "pluginId": "mock-audit-logger",
      "blockId": "audit-stream",
      "position": { "col": 9, "row": 1, "colSpan": 4, "rowSpan": 10 }
    }
  ]
}
```

**Grid system:** The canvas uses a 12-column grid. `col` is 1-based. `colSpan` + `col - 1` must not exceed 12. `rowSpan` uses 60px auto rows.

**Layout types:**
- `single` — one full-width panel
- `split` — two-column split
- `grid` — multi-panel grid
- `focus` — one focused panel with small sidebar

To make the intent classifier route to your recipe, add keywords to `packages/core/src/workspace/classifier.ts`.

---

## 6. Complete Worked Example

### Goal: Build a `mock-translator` plugin

**Step 1: Create the directory structure**
```
plugins/mock-translator/
  manifest.json
  package.json
  src/index.ts
```

**Step 2: Write the manifest**
```json
{
  "id": "mock-translator",
  "name": "Translator",
  "description": "Mock translation plugin",
  "version": "1.0.0",
  "capabilities": ["translate", "detect-language"],
  "inputSchema": { "type": "object", "properties": { "text": { "type": "string" }, "targetLang": { "type": "string" } } },
  "outputSchema": { "type": "object", "properties": { "translated": { "type": "string" } } },
  "configSchema": {},
  "permissions": ["network"],
  "actions": [
    {
      "id": "translate",
      "name": "Translate",
      "description": "Translate text to a target language",
      "inputSchema": { "type": "object", "properties": { "text": { "type": "string" }, "targetLang": { "type": "string" } } },
      "outputSchema": { "type": "object", "properties": { "translated": { "type": "string" }, "sourceLang": { "type": "string" } } }
    }
  ],
  "uiBlocks": [
    { "id": "translate-panel", "name": "Translate Panel", "role": "primary", "minWidth": 350 }
  ],
  "emits": ["translation.complete"],
  "listensTo": [],
  "standaloneMode": true,
  "mainAppIntegration": true
}
```

**Step 3: Implement the handler**
```ts
// src/index.ts
export default async function handler(
  action: string,
  input: { text?: string; targetLang?: string }
): Promise<{ translated: string; sourceLang: string; latencyMs: number }> {
  await new Promise(r => setTimeout(r, 150 + Math.random() * 150));

  if (action === 'translate') {
    const text = input.text ?? '';
    const target = input.targetLang ?? 'en';
    return {
      translated: `[MOCK ${target.toUpperCase()}] ${text}`,
      sourceLang: 'auto-detected',
      latencyMs: 160,
    };
  }
  throw new Error(`Unknown action: ${action}`);
}
```

**Step 4: Write the package.json**
```json
{
  "name": "@morphius/plugin-mock-translator",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": { "@morphius/core": "*" }
}
```

**Step 5: Write a recipe**

Create `recipes/translate.recipe.json`:
```json
{
  "id": "translate",
  "name": "Translation Workspace",
  "description": "Side-by-side translation workspace",
  "requiredPlugins": ["mock-translator", "mock-audit-logger"],
  "layout": "split",
  "defaultPanels": [
    {
      "id": "translate-main",
      "pluginId": "mock-translator",
      "blockId": "translate-panel",
      "position": { "col": 1, "row": 1, "colSpan": 9, "rowSpan": 10 }
    },
    {
      "id": "translate-audit",
      "pluginId": "mock-audit-logger",
      "blockId": "audit-stream",
      "position": { "col": 10, "row": 1, "colSpan": 3, "rowSpan": 10 }
    }
  ]
}
```

**Step 6: Restart the backend**

The backend will auto-discover your new plugin on next startup. Verify at `GET /api/plugins`.

---

## EventBus Integration

To have your plugin communicate with others via events:

```ts
import { globalBus } from '@morphius/core';

// In your handler, after completing work:
await globalBus.publish('translation.complete', 'mock-translator', {
  text: input.text,
  translated: result.translated,
});
```

Subscribe to events from other plugins:
```ts
globalBus.subscribe('response.complete', async (event) => {
  console.log('LLM response received:', event.payload);
});
```

Wildcard subscriptions: `globalBus.subscribe('*', handler)` receives all events.

---

## AuditLogger Integration

```ts
import { auditLogger } from '@morphius/core';

auditLogger.log(
  'mock-translator',   // source
  'translate',         // action
  { text, targetLang }, // payload
  'ok',               // status: 'ok' | 'error' | 'pending'
  sessionId           // session id
);
```

---

## PermissionGate

Before performing a sensitive action, check permissions:

```ts
import { globalPermissionGate } from '@morphius/core';

if (!globalPermissionGate.check('mock-translator', 'network')) {
  const req = globalPermissionGate.requestApproval(
    'mock-translator',
    'network',
    'Translator needs network access to call translation API'
  );
  // The approval request is sent to the UI via the ApprovalPanel
  throw new Error('Permission required: ' + req.id);
}
```
