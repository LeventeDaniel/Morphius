import type { PluginManifest } from './manifest.js';

export interface PluginEntry {
  manifest: PluginManifest;
  enabled: boolean;
  loadedAt: string;
  errorCount: number;
}

export class PluginRegistry {
  private plugins: Map<string, PluginEntry> = new Map();

  register(manifest: PluginManifest): void {
    if (this.plugins.has(manifest.id)) {
      console.warn(`[PluginRegistry] Plugin "${manifest.id}" already registered — overwriting.`);
    }
    this.plugins.set(manifest.id, {
      manifest,
      enabled: true,
      loadedAt: new Date().toISOString(),
      errorCount: 0,
    });
  }

  unregister(id: string): boolean {
    return this.plugins.delete(id);
  }

  get(id: string): PluginEntry | undefined {
    return this.plugins.get(id);
  }

  getManifest(id: string): PluginManifest | undefined {
    return this.plugins.get(id)?.manifest;
  }

  list(): PluginEntry[] {
    return Array.from(this.plugins.values());
  }

  listManifests(): PluginManifest[] {
    return this.list().map((e) => e.manifest);
  }

  has(id: string): boolean {
    return this.plugins.has(id);
  }

  enable(id: string): void {
    const entry = this.plugins.get(id);
    if (entry) entry.enabled = true;
  }

  disable(id: string): void {
    const entry = this.plugins.get(id);
    if (entry) entry.enabled = false;
  }

  recordError(id: string): void {
    const entry = this.plugins.get(id);
    if (entry) entry.errorCount++;
  }

  clear(): void {
    this.plugins.clear();
  }

  size(): number {
    return this.plugins.size;
  }
}

// Singleton instance
export const globalRegistry = new PluginRegistry();
