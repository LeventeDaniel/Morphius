// Preload: sets NODE_PATH and env vars from .env before any module loads.
// Required via tsx --require so it runs before the TypeScript entry point.
const fs = require('fs');
const path = require('path');
const Module = require('module');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
  // Re-init module paths so NODE_PATH takes effect for all subsequent requires
  if (typeof Module._initPaths === 'function') Module._initPaths();
}
