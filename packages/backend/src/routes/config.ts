import { Hono } from 'hono';
import { config } from '../config/loader.js';

const app = new Hono();

// GET /api/config — safe public config (no secrets)
app.get('/', (c) => {
  return c.json({
    version: config.version,
    mockMode: config.mockMode,
    features: {
      plugins: true,
      workspaceRecipes: true,
      auditLog: true,
      permissionGate: true,
      eventBus: true,
    },
    limits: {
      maxAuditEvents: 100,
      maxPlugins: 50,
    },
  });
});

export default app;
