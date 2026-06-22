export const config = {
  port: Number(process.env.MORPHIUS_PORT ?? 7900),
  dbPath: process.env.MORPHIUS_DB ?? './data/morphius.db',
  pluginsDir: process.env.MORPHIUS_PLUGINS_DIR ?? '',
  mockMode: process.env.MORPHIUS_MOCK_MODE !== 'false',
  version: '0.1.0',
  corsOrigin: process.env.MORPHIUS_CORS_ORIGIN ?? 'http://localhost:5173',
} as const;

export type Config = typeof config;
