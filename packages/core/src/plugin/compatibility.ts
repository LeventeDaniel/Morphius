/**
 * Progressive compatibility checker for Morphius module manifests.
 *
 * Levels:
 *   loadable   — minimum fields only (id, name, version, type, entry)
 *   usable     — adds description, window, permissions, basic metadata
 *   integrated — adds actions, Connect references, workflow compat
 *   advanced   — adds provider metadata, sandbox hints, typed schemas
 *
 * Policy:
 *   ERROR        = cannot load (missing minimum field or obvious secret)
 *   WARNING      = can load but may be limited
 *   RECOMMENDATION = could improve Morphius compatibility
 */

import type { CompatibilityResult, ModuleManifestFull, ProviderMeta } from './manifest.js';

// ─── Known provider kinds ─────────────────────────────────────────────────────

const KNOWN_PROVIDER_KINDS = new Set([
  'permission', 'approval', 'sandbox', 'audit',
  'policy', 'auth', 'execution', 'connection', 'generic',
]);

// ─── Secret patterns (never allow in manifests) ───────────────────────────────

const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /sk-[A-Za-z0-9]{20,}/, label: 'OpenAI/Anthropic API key (sk-...)' },
  { pattern: /ghp_[A-Za-z0-9]{36}/, label: 'GitHub personal access token' },
  { pattern: /xoxb-[0-9]+-[A-Za-z0-9]+/, label: 'Slack bot token' },
  { pattern: /ya29\.[A-Za-z0-9_-]+/, label: 'Google OAuth token' },
  { pattern: /"api[_-]?key"\s*:\s*"[A-Za-z0-9]{16,}"/, label: 'api_key with real value' },
  { pattern: /"password"\s*:\s*"[^"]{4,}"/, label: 'password field with value' },
  { pattern: /"token"\s*:\s*"[A-Za-z0-9._-]{20,}"/, label: 'token field with long value' },
  { pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, label: 'PEM private key' },
];

// ─── Main checker ─────────────────────────────────────────────────────────────

export function checkCompatibility(raw: unknown): CompatibilityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Must be an object
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { loadable: false, level: 'loadable', errors: ['manifest must be a JSON object'], warnings, recommendations };
  }

  const m = raw as Record<string, unknown>;

  // ── Minimum required fields ──────────────────────────────────────────────────

  if (!m.id || typeof m.id !== 'string' || m.id.trim() === '') {
    errors.push('id: required — must be a non-empty string');
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id)) {
    warnings.push('id: recommended kebab-case (e.g. my-module) for best compatibility');
  }

  if (!m.name || typeof m.name !== 'string' || m.name.trim() === '') {
    errors.push('name: required — must be a non-empty string');
  }

  if (!m.version || typeof m.version !== 'string') {
    errors.push('version: required — must be a string (e.g. 1.0.0)');
  } else if (!/^\d+\.\d+\.\d+/.test(m.version)) {
    warnings.push('version: should follow semver (e.g. 1.0.0) for best compatibility');
  }

  if (!m.type || typeof m.type !== 'string' || m.type.trim() === '') {
    errors.push('type: required — must be a non-empty string');
  }

  if (!m.entry || typeof m.entry !== 'string' || m.entry.trim() === '') {
    errors.push('entry: required — must be a non-empty string path');
  }

  // Secret scan — always an error
  const rawStr = JSON.stringify(raw);
  for (const { pattern, label } of SECRET_PATTERNS) {
    if (pattern.test(rawStr)) {
      errors.push(`SECURITY: manifest appears to contain a real secret (${label}). Use secretRefs instead.`);
    }
  }

  if (errors.length > 0) {
    return { loadable: false, level: 'loadable', errors, warnings, recommendations };
  }

  // ── Loadable — minimum fields present, no errors ──────────────────────────

  let level: CompatibilityResult['level'] = 'loadable';

  // ── Check for usable-level fields ────────────────────────────────────────────

  const hasDescription = typeof m.description === 'string' && m.description.trim().length > 0;
  const hasPermissions = Array.isArray(m.permissions);
  const hasWindow = m.window !== undefined && typeof m.window === 'object';

  if (!hasDescription) {
    recommendations.push('description: add a short description for better display in Morphius');
  }
  if (!hasPermissions) {
    recommendations.push('permissions: add an empty array [] or list your required permissions');
  }
  if (!hasWindow) {
    recommendations.push('window: add window preferences (defaultWidth, defaultHeight) for better UX');
  }

  const hasActions = Array.isArray(m.actions) && (m.actions as unknown[]).length > 0;
  const hasConnectors = Array.isArray(m.connectors) && (m.connectors as unknown[]).length > 0;
  const hasWorkflowCompat = typeof m.workflowCompatible === 'boolean';

  if (hasDescription && hasPermissions) {
    level = 'usable';
  }

  // ── Check for integrated-level fields ────────────────────────────────────────

  if (level === 'usable') {
    if (!hasActions) {
      recommendations.push('actions: declare your module actions for richer Morphius integration');
    }
    if (!hasConnectors && !hasWorkflowCompat) {
      recommendations.push('workflowCompatible: set to true if this module can participate in workflows');
    }

    if (hasActions) {
      level = 'integrated';
    }
  }

  // ── Check for advanced-level fields ──────────────────────────────────────────

  const hasProvider = m.provider !== undefined && typeof m.provider === 'object';
  const hasSandbox = m.sandbox !== undefined && typeof m.sandbox === 'object';

  if (level === 'integrated') {
    if (!hasProvider) {
      recommendations.push('provider: optional — add provider metadata if this module fills a system role');
    }

    if (hasProvider || hasSandbox) {
      level = 'advanced';
    }
  }

  // ── Provider validation (warnings only, not errors) ───────────────────────

  if (hasProvider) {
    const provider = m.provider as ProviderMeta;
    if (typeof provider.kind !== 'string' || provider.kind.trim() === '') {
      warnings.push('provider.kind: should be a non-empty string (e.g. "approval", "audit")');
    } else if (!KNOWN_PROVIDER_KINDS.has(provider.kind)) {
      warnings.push(`provider.kind: "${provider.kind}" is not a recognized kind — will display as experimental`);
    }
    if (!Array.isArray(provider.handles)) {
      recommendations.push('provider.handles: add the request types this provider handles (e.g. ["approval.request"])');
    }
    if (!Array.isArray(provider.decisions)) {
      recommendations.push('provider.decisions: add possible decisions (e.g. ["allow", "block"])');
    }
  }

  // ── Unknown type warning ──────────────────────────────────────────────────

  const knownTypes = new Set(['frontend', 'backend', 'fullstack', 'workflow', 'provider']);
  if (typeof m.type === 'string' && !knownTypes.has(m.type)) {
    warnings.push(`type: "${m.type}" is not a standard type — will display as experimental`);
  }

  return { loadable: true, level, errors, warnings, recommendations };
}

// ─── Shape an unknown raw manifest into ModuleManifestFull (best-effort) ─────

export function shapeManifest(raw: unknown): ModuleManifestFull | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  if (!m.id || !m.name || !m.version || !m.type || !m.entry) return null;

  return {
    id: String(m.id),
    name: String(m.name),
    version: String(m.version),
    type: String(m.type),
    entry: String(m.entry),
    description: typeof m.description === 'string' ? m.description : undefined,
    backendEntry: typeof m.backendEntry === 'string' ? m.backendEntry : undefined,
    permissions: Array.isArray(m.permissions) ? (m.permissions as string[]) : undefined,
    connectors: Array.isArray(m.connectors) ? (m.connectors as Array<{ name: string; description?: string }>) : undefined,
    secretRefs: Array.isArray(m.secretRefs) ? (m.secretRefs as Array<{ name: string; description?: string }>) : undefined,
    window: m.window && typeof m.window === 'object' ? (m.window as ModuleManifestFull['window']) : undefined,
    actions: Array.isArray(m.actions) ? (m.actions as Array<{ id: string; name: string; description?: string }>) : undefined,
    eventsEmitted: Array.isArray(m.eventsEmitted) ? (m.eventsEmitted as Array<{ name: string; description?: string }>) : undefined,
    eventsListened: Array.isArray(m.eventsListened) ? (m.eventsListened as Array<{ name: string; description?: string }>) : undefined,
    morphiusVersion: typeof m.morphiusVersion === 'string' ? m.morphiusVersion : undefined,
    tags: Array.isArray(m.tags) ? (m.tags as string[]) : undefined,
    author: typeof m.author === 'string' ? m.author : undefined,
    provider: m.provider && typeof m.provider === 'object' ? (m.provider as import('./manifest.js').ProviderMeta) : undefined,
    workflowCompatible: typeof m.workflowCompatible === 'boolean' ? m.workflowCompatible : undefined,
    mockMode: typeof m.mockMode === 'boolean' ? m.mockMode : undefined,
    sandbox: m.sandbox && typeof m.sandbox === 'object' ? (m.sandbox as ModuleManifestFull['sandbox']) : undefined,
  };
}
