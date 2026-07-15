import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from './config/loader.js';
import { getDb } from './db/client.js';
import { loadPluginManifests } from './registry/loader.js';
import { globalRegistry } from '@morphius/core';

import pluginsRoute from './routes/plugins.js';
import workspaceRoute from './routes/workspace.js';
import auditRoute from './routes/audit.js';
import configRoute from './routes/config.js';
import hostRoute from './routes/host.js';
import runtimeRoute from './routes/runtime.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({ origin: config.corsOrigin, allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: config.version,
    mockMode: config.mockMode,
    timestamp: new Date().toISOString(),
    plugins: globalRegistry.size(),
  });
});

// Routes
app.route('/api/plugins', pluginsRoute);
app.route('/api/workspace', workspaceRoute);
app.route('/api/audit', auditRoute);
app.route('/api/config', configRoute);
app.route('/api/host', hostRoute);
app.route('/api/runtime', runtimeRoute);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('[Server Error]', err);
  return c.json({ error: 'Internal server error', detail: err.message }, 500);
});

// Initialize
async function bootstrap() {
  // Init DB
  getDb();

  // Load plugins
  const { loaded, errors } = loadPluginManifests();
  for (const manifest of loaded) {
    globalRegistry.register(manifest);
  }

  if (errors.length > 0) {
    console.warn(`[Bootstrap] ${errors.length} plugin(s) failed to load:`, errors);
  }

  console.log(`[Bootstrap] ${loaded.length} plugin(s) loaded`);
  console.log(`[Bootstrap] Mock mode: ${config.mockMode}`);

  // Start server
  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`[Server] Morphius backend running on http://localhost:${info.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal error:', err);
  process.exit(1);
});

export default app;
