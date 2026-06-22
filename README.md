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
  <a href="https://github.com/LeventeDaniel/Morphius_Forge">Morphius Forge</a> ·
  <a href="https://github.com/LeventeDaniel/Morphius_Connect">Morphius Connect</a>
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

## Screenshots

<p align="center">
  <img src="packages/frontend/public/screenshots/screenshot-1.png" width="48%" />
  <img src="packages/frontend/public/screenshots/screenshot-2.png" width="48%" />
</p>
<p align="center">
  <img src="packages/frontend/public/screenshots/screenshot-3.png" width="48%" />
  <img src="packages/frontend/public/screenshots/screenshot-4.png" width="48%" />
</p>
<p align="center">
  <img src="packages/frontend/public/screenshots/screenshot-5.png" width="48%" />
</p>

---

## How it looks

> **Canvas — empty by default**

The shell opens blank. The Morphius wordmark and logo sit in the center. A draggable `+` button floats in the corner. Press `/` to start.

> **Loading a module**

Enter a folder path to any Forge-compatible module. Morphius reads its `manifest.json`, opens a floating window at the declared size, and gets out of the way. No installation. No file copying. No code executed during load.

> **Floating windows**

Every module lives in a draggable floating window. Minimise to title bar with `▼`. Restore with `▲`. Stack, rearrange, close — the canvas is yours.

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

1. Press `/` to open the command launcher
2. Type `load module` and press Enter
3. Enter the full path to any Forge-compatible module folder
4. Press Enter

The module opens as a floating window. Build your own with [Morphius Forge](https://github.com/LeventeDaniel/Morphius_Forge).

**Built-in commands:**

| Command | Action |
|---|---|
| `load module` | Load a module from a folder path |
| `open terminal` | Open a terminal window |
| `reset canvas` | Close all windows |
| `help` | Show command list |

---

## Architecture

```
WebtopShell
├── WebtopTopbar         top bar
├── WebtopCanvas         freeform canvas — all windows live here
│   └── FloatingWindow   draggable container
│       └── [content]    routed by contentKind
└── WebtopStatusBar      minimised chips + window count

CommandLauncher          overlay — press / or click +
```

**Three packages:**

| Package | Purpose |
|---|---|
| `packages/core` | Shared TypeScript types — PluginManifest, EventBus, AuditLogger, PermissionGate |
| `packages/backend` | Hono API server on port 7900 — plugin registry, audit log, generic module mount |
| `packages/frontend` | React 18 + Vite + Zustand — canvas, windows, command launcher |

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

Morphius is designed to work with two optional companion repos. Neither is required to run.

### Morphius Forge

Module creation kit. Provides:
- CLI: `morphius-forge create`, `validate`, `inspect`, `serve`
- Templates: frontend, backend, fullstack, workflow, provider
- Validator: checks manifest structure, detects hardcoded secrets, warns on design violations
- Design guide: enforced color palette, typography, window sizing
- Forge Status module — a plug-and-play Morphius module that shows live scan results

Forge is fully standalone. It has no dependency on Morphius internals — it runs its own lightweight HTTP server (`morphius-forge serve`) that the Forge Status module connects to. Morphius has no knowledge of Forge.

→ [github.com/LeventeDaniel/Morphius_Forge](https://github.com/LeventeDaniel/Morphius_Forge)

### Morphius Connect

Connection and secrets manager. All server-side only — no secret values ever reach the frontend.

→ [github.com/LeventeDaniel/Morphius_Connect](https://github.com/LeventeDaniel/Morphius_Connect)

---

## Backend API

Base: `http://localhost:7900`

```
GET  /health

GET  /api/plugins               list plugin manifests
GET  /api/plugins/:id           get plugin manifest
POST /api/plugins/mount         register a module from a folder path { path }
POST /api/plugins/:id/run       run action { action, input }

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
