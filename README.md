<p align="center">
  <img src="packages/frontend/public/logo.png" alt="Morphius" width="160" />
</p>

<h1 align="center">MORPHIUS</h1>

<p align="center">
  A blank-canvas webtop host for the browser.<br/>
  No built-in apps. No dashboards. Everything comes from modules.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-4ade80?style=flat-square&labelColor=111" alt="version" />
  <img src="https://img.shields.io/badge/license-MIT-4ade80?style=flat-square&labelColor=111" alt="license" />
  <img src="https://img.shields.io/badge/Node.js-20+-4ade80?style=flat-square&labelColor=111" alt="node" />
  <img src="https://img.shields.io/badge/React-18-4ade80?style=flat-square&labelColor=111" alt="react" />
</p>

<p align="center">
  <a href="https://github.com/LeventeDaniel/Morphius">Morphius</a> ·
  <a href="https://github.com/LeventeDaniel/Morphius_Forge">Morphius Forge</a>
</p>

---

## What is Morphius?

Morphius is an operating system shell for the browser. It opens as a completely empty dark canvas — no apps, no widgets, no hardcoded tools. The shell owns exactly three things: the canvas, the floating windows, and the command launcher. Everything else comes from a module you load.

Think of it as a blank desktop where you build your own tool layout by loading exactly what you need, nothing more.

```
Press /  →  type a command  →  load a module  →  a window appears
```

That's it.

---

## How it looks

> **Canvas — empty by default**

The shell opens blank. The Morphius wordmark and logo sit in the center. A draggable `+` button floats in the corner. Press `/` to start.

> **Loading a module**

Click the `+` button or press `/` to open the Load Module window. Enter a folder path to any Forge-compatible module. Morphius reads its `manifest.json`, mounts the module's backend into the Host runtime, opens a floating window at the declared size, and gets out of the way. No installation. No file copying.

> **Floating windows**

Every module lives in a draggable floating window. Drag by the title bar to move. Collapse to title bar with `▼` — the collapse button is separate from drag so moving a window never triggers collapse. Restore with `▲`. Stack, rearrange, close — the canvas is yours.

---

## Quick start

**Prerequisites:** Node.js 20 LTS or newer, npm 10+

```bash
git clone https://github.com/LeventeDaniel/Morphius.git
cd morphius
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:7900 |

Open http://localhost:5173 — you should see a black canvas with the Morphius logo.

---

## Loading your first module

1. Click the `+` button (bottom-right of canvas) to open the Load Module window
2. Enter the full path to any Forge-compatible module folder
3. Press **LOAD** — the module mounts and its window opens immediately

The module name, size, and position come from the module's own `manifest.json`. Morphius gets out of the way.

**Canvas controls:**

| Action | How |
|---|---|
| Load a module | `+` button → enter folder path |
| Move a window | Drag the title bar |
| Collapse a window | `▼` button on title bar |
| Minimize to taskbar | `−` button on title bar |
| Close a window | `×` button on title bar |
| Reset canvas | Close all windows individually, or use Auto Layout's CLEAR CANVAS |

**Auto Layout** saves your canvas automatically. On refresh or server restart, all windows reopen exactly where you left them — same position, same size, same collapsed/minimized state.

---

## Architecture

```
WebtopShell
├── WebtopTopbar              top bar
├── WebtopCanvas              freeform canvas — all windows live here
│   └── FloatingWindow        draggable container (title bar drag / collapse / minimize)
│       └── [content]         routed by contentKind:
│           ├── module-iframe   compiled module UI in sandboxed iframe
│           ├── plugin-manifest module loaded via pipeline
│           ├── terminal        built-in terminal
│           └── core            built-in core windows (Load Module, etc.)
└── WebtopStatusBar           minimized window chips + window count
```

**Boot sequence:** `WebtopShell` calls `loadSavedLayout()` on startup, which dispatches `loadLayout` to the Auto Layout module via `/api/host/dispatch`. All saved windows reopen at their saved position, size, and state (open / collapsed / minimized). Core owns no layout opinion — Auto Layout decides what restores.

**Module iframe pipeline:** when a fullstack module is opened, `ModuleRuntime` compiles its `entry` TSX into an IIFE bundle via esbuild, injects a `window.morphius` bridge (callAction, moduleId, name, description), and serves it in a sandboxed iframe. The bundle is cached — subsequent opens are instant.

**Three packages:**

| Package | Purpose |
|---|---|
| `packages/core` | Shared TypeScript types — PluginManifest, EventBus, AuditLogger, PermissionGate |
| `packages/backend` | Hono API server on port 7900 — plugin registry, audit log, Host dispatch bridge |
| `packages/frontend` | React 18 + Vite + Zustand — canvas, windows, command launcher |

**Host dispatch bridge (`/api/host`):** Morphius ships a backend bridge that lets fullstack modules run a Node.js backend. A module declares a `backendEntry` TypeScript file exporting an `actions` map. The Host loads it at runtime and routes `POST /api/host/dispatch` calls to the right handler. The backend owns no opinions — it just executes what the module declares.

---

## Modules

Modules are self-contained folders with a `manifest.json`. Morphius reads the manifest, opens a window, and loads the module inside it.

**Minimum manifest:**

```json
{
  "id": "my-module",
  "name": "My Module",
  "version": "1.0.0",
  "type": "frontend",
  "entry": "./src/module.tsx",
  "window": {
    "defaultWidth": 480,
    "defaultHeight": 380,
    "minimizable": true,
    "initialPosition": "center"
  }
}
```

**Security rules — always:**
- Discovery reads only `manifest.json` — no code is imported or executed during scan
- Secret values never leave the server — modules declare secret names only (`secretRefs`)
- Permissions are metadata — no runtime grants are applied automatically
- Modules are fully isolated — no access to other modules' state or data

**Full manifest reference:** see [Morphius Forge](https://github.com/LeventeDaniel/Morphius_Forge) for the complete module authoring guide, CLI tools, templates, and validator.

---

## Companion systems

### Morphius Forge

Module creation kit. Provides:
- CLI: `morphius-forge create`, `validate`, `inspect`, `serve`
- Templates: frontend, backend, fullstack, workflow, provider
- Validator: checks manifest structure, detects hardcoded secrets, warns on design violations
- Design guide: enforced color palette, typography, window sizing
- Forge Status module — a plug-and-play Morphius module that shows live scan results

Forge is fully standalone. It has no dependency on Morphius internals — it runs its own lightweight HTTP server (`morphius-forge serve`) that the Forge Status module connects to. Morphius has no knowledge of Forge.

→ [github.com/LeventeDaniel/Morphius_Forge](https://github.com/LeventeDaniel/Morphius_Forge)

---

## Backend API

Base: `http://localhost:7900`

```
GET  /health

GET  /api/plugins               list mounted module manifests
GET  /api/plugins/:id           get a module manifest
POST /api/plugins/mount         register a module from a folder path { path }
POST /api/plugins/:id/run       run action { action, input }

POST /api/host/load             load a module's backend into the Host runtime { moduleId }
POST /api/host/dispatch         call a module action through Host { moduleId, action, input }
GET  /api/host/status           list loaded modules and Host runtime state
GET  /api/host/restore          return all saved surface states for canvas rehydration

GET  /api/workspace/recipes     list recipes
GET  /api/workspace/recipe/:id  get recipe
POST /api/workspace/classify    classify intent { input }

GET  /api/audit                 list audit events
POST /api/audit                 log event

GET  /api/config                version, features, limits (no secrets)
```

---

## Configuration

All configuration is via environment variables. No secrets in code.

**Backend**

| Variable | Default | Description |
|---|---|---|
| `MORPHIUS_PORT` | `7900` | Backend server port |
| `MORPHIUS_DB` | `./data/morphius.db` | SQLite database path |
| `MORPHIUS_PLUGINS_DIR` | _(empty)_ | Optional: auto-load plugins from a directory on startup |
| `MORPHIUS_MOCK_MODE` | `true` | Mock mode — no real API calls |
| `MORPHIUS_CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

**Frontend**

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:7900` | Backend URL |

---

## Design system

One accent color. Dark greys only. No exceptions.

| Token | Value | Usage |
|---|---|---|
| `--accent` / `--status-ok` | `#4ade80` | The only accent — use sparingly |
| `--status-error` | `#f87171` | Errors only |
| `--bg-webtop` | `#050505` | Canvas background |
| `--bg-secondary` | `#111111` | Window interiors |
| `--bg-panel` | `#161616` | Cards, inputs |
| `--bg-titlebar` | `#1e1e1e` | Title bars |
| `--border` | `#2a2a2a` | All borders |
| `--text-primary` | `#e8e8e8` | Main text |
| `--text-secondary` | `#888888` | Descriptions |
| `--text-muted` | `#444444` | Labels, metadata |

The Forge validator enforces this palette — modules using blue, purple, yellow, or orange accents receive warnings on validation.

---

## License

MIT © [Levente Daniel Feher](https://github.com/LeventeDaniel)
