import { z } from 'zod';
import type { PluginManifest } from './manifest.js';

const ActionDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  inputSchema: z.record(z.unknown()).default({}),
  outputSchema: z.record(z.unknown()).default({}),
});

const UIBlockDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(['primary', 'sidebar', 'panel', 'chip', 'overlay']),
  minWidth: z.number().optional(),
  minHeight: z.number().optional(),
});

export const PluginManifestSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Plugin id must be kebab-case'),
  name: z.string().min(1),
  description: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver'),
  capabilities: z.array(z.string()),
  inputSchema: z.record(z.unknown()).default({}),
  outputSchema: z.record(z.unknown()).default({}),
  configSchema: z.record(z.unknown()).default({}),
  permissions: z.array(z.string()),
  actions: z.array(ActionDefSchema),
  uiBlocks: z.array(UIBlockDefSchema),
  emits: z.array(z.string()),
  listensTo: z.array(z.string()),
  standaloneMode: z.boolean(),
  mainAppIntegration: z.boolean(),
});

export type ValidatedPluginManifest = z.infer<typeof PluginManifestSchema>;

export interface ValidationResult {
  valid: boolean;
  manifest?: PluginManifest;
  errors?: string[];
}

export function validateManifest(raw: unknown): ValidationResult {
  const result = PluginManifestSchema.safeParse(raw);
  if (result.success) {
    return { valid: true, manifest: result.data as PluginManifest };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );
  return { valid: false, errors };
}
