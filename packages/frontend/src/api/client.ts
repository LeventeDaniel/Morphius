// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_URL: string = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:7900';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type CompatibilityLevel = 'loadable' | 'usable' | 'integrated' | 'advanced';

export interface ProviderMetaDTO {
  kind: string;
  handles?: string[];
  decisions?: string[];
  [key: string]: unknown;
}

export interface MountedModuleDTO {
  id: string;
  name: string;
  version: string;
  type: string;
  description: string;
  permissions: string[];
  connectors: Array<{ name: string; description?: string }>;
  secretRefs: Array<{ name: string; description?: string }>;
  window?: { defaultWidth?: number; defaultHeight?: number; resizable?: boolean; collapsible?: boolean; minimizable?: boolean };
  actions: Array<{ id: string; name: string; description?: string }>;
  tags: string[];
  author?: string;
  source: 'external';
  sourceLabel: string;
  manifestKind: 'module' | 'workflow';
  warnings: string[];
  provider?: ProviderMetaDTO;
  _folderPath?: string;
}

export interface PluginManifestDTO {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  permissions: string[];
  actions: Array<{ id: string; name: string; description: string }>;
  uiBlocks: Array<{ id: string; name: string; role: string }>;
  emits: string[];
  listensTo: string[];
  standaloneMode: boolean;
  mainAppIntegration: boolean;
}

export interface RecipeDTO {
  id: string;
  name: string;
  description: string;
  requiredPlugins: string[];
  layout: 'single' | 'split' | 'grid' | 'focus';
  defaultPanels: Array<{
    id: string;
    pluginId: string;
    blockId: string;
    position: { col: number; row: number; colSpan: number; rowSpan: number };
  }>;
}

export interface AuditEventDTO {
  id: string;
  timestamp: string;
  source: string;
  action: string;
  payload: unknown;
  status: 'ok' | 'error' | 'pending';
  sessionId: string;
}

export interface ClassifyResult {
  recipeId: string;
  confidence: number;
  matchedKeywords: string[];
}

export const api = {
  health: () => request<{ status: string; version: string; plugins: number }>('/health'),

  plugins: {
    list: () => request<{ plugins: PluginManifestDTO[]; total: number }>('/api/plugins'),
    get: (id: string) => request<PluginManifestDTO>(`/api/plugins/${id}`),
    mount: (folderPath: string) =>
      request<{ ok: boolean; error?: string; warnings: string[]; module?: MountedModuleDTO }>(
        '/api/plugins/mount',
        { method: 'POST', body: JSON.stringify({ path: folderPath }) }
      ),
    run: (id: string, action: string, input: unknown) =>
      request<{ pluginId: string; action: string; output: unknown; executedAt: string }>(
        `/api/plugins/${id}/run`,
        { method: 'POST', body: JSON.stringify({ action, input }) }
      ),
  },

  workspace: {
    recipes: () => request<{ recipes: RecipeDTO[]; total: number }>('/api/workspace/recipes'),
    recipe: (id: string) => request<RecipeDTO>(`/api/workspace/recipe/${id}`),
    classify: (input: string) =>
      request<ClassifyResult>('/api/workspace/classify', {
        method: 'POST',
        body: JSON.stringify({ input }),
      }),
  },

  audit: {
    list: (params?: { limit?: number; source?: string; sessionId?: string }) => {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.source) qs.set('source', params.source);
      if (params?.sessionId) qs.set('sessionId', params.sessionId);
      const query = qs.toString() ? `?${qs}` : '';
      return request<{ events: AuditEventDTO[]; total: number }>(`/api/audit${query}`);
    },
    log: (event: Omit<AuditEventDTO, 'id' | 'timestamp'>) =>
      request<AuditEventDTO>('/api/audit', { method: 'POST', body: JSON.stringify(event) }),
  },

  config: () => request<{ version: string; mockMode: boolean; features: Record<string, boolean> }>('/api/config'),
};
