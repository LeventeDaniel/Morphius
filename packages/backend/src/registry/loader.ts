import { readdirSync, existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { validateManifest } from '@morphius/core';
import type { PluginManifest } from '@morphius/core';
import { config } from '../config/loader.js';

export interface LoadResult {
  loaded: PluginManifest[];
  errors: Array<{ dir: string; error: string }>;
}

export function loadPluginManifests(): LoadResult {
  const pluginsDir = resolve(process.cwd(), config.pluginsDir);
  const loaded: PluginManifest[] = [];
  const errors: Array<{ dir: string; error: string }> = [];

  if (!existsSync(pluginsDir)) {
    console.warn(`[Loader] Plugins directory not found: ${pluginsDir}`);
    return { loaded, errors };
  }

  let entries: string[];
  try {
    entries = readdirSync(pluginsDir);
  } catch (err) {
    console.error(`[Loader] Failed to read plugins dir: ${err}`);
    return { loaded, errors };
  }

  for (const entry of entries) {
    const pluginDir = join(pluginsDir, entry);
    const manifestPath = join(pluginDir, 'manifest.json');

    if (!existsSync(manifestPath)) {
      continue; // Not a plugin directory
    }

    try {
      const raw = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const result = validateManifest(raw);

      if (result.valid && result.manifest) {
        loaded.push(result.manifest);
        console.log(`[Loader] Loaded plugin: ${result.manifest.id} v${result.manifest.version}`);
      } else {
        const errorMsg = result.errors?.join('; ') ?? 'Unknown validation error';
        errors.push({ dir: entry, error: errorMsg });
        console.warn(`[Loader] Invalid manifest in ${entry}: ${errorMsg}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({ dir: entry, error: errorMsg });
      console.warn(`[Loader] Failed to load ${entry}: ${errorMsg}`);
    }
  }

  return { loaded, errors };
}
