// ─── Compatibility levels ─────────────────────────────────────────────────────

export type CompatibilityLevel = 'loadable' | 'usable' | 'integrated' | 'advanced';

export type IssueKind = 'error' | 'warning' | 'recommendation';

export interface CompatibilityIssue {
  kind: IssueKind;
  message: string;
}

export interface CompatibilityResult {
  loadable: boolean;
  level: CompatibilityLevel;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// ─── Provider metadata (optional, flexible) ──────────────────────────────────

export type ProviderKind =
  | 'permission'
  | 'approval'
  | 'sandbox'
  | 'audit'
  | 'policy'
  | 'auth'
  | 'execution'
  | 'connection'
  | 'generic'
  | string; // unknown kinds are allowed (shown as experimental)

export interface ProviderMeta {
  kind: ProviderKind;
  handles?: string[];
  decisions?: string[];
  [key: string]: unknown; // permit extra provider fields
}

// ─── Core plugin manifest (used by built-in plugins) ─────────────────────────

export interface ActionDef {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface UIBlockDef {
  id: string;
  name: string;
  role: 'primary' | 'sidebar' | 'panel' | 'chip' | 'overlay';
  minWidth?: number;
  minHeight?: number;
}

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  configSchema: Record<string, unknown>;
  permissions: string[];
  actions: ActionDef[];
  uiBlocks: UIBlockDef[];
  emits: string[];
  listensTo: string[];
  standaloneMode: boolean;
  mainAppIntegration: boolean;
}

// ─── Progressive external module manifest (minimum to advanced) ───────────────

export interface ModuleManifestMinimal {
  id: string;
  name: string;
  version: string;
  type: string; // 'frontend' | 'backend' | 'fullstack' | 'workflow' | 'provider' | any string
  entry: string;
}

export interface ModuleManifestFull extends ModuleManifestMinimal {
  description?: string;
  backendEntry?: string;
  permissions?: string[];
  connectors?: Array<{ name: string; description?: string }>;
  secretRefs?: Array<{ name: string; description?: string }>;
  window?: {
    defaultWidth?: number;
    defaultHeight?: number;
    resizable?: boolean;
    collapsible?: boolean;
    minimizable?: boolean;
  };
  actions?: Array<{ id: string; name: string; description?: string }>;
  eventsEmitted?: Array<{ name: string; description?: string }>;
  eventsListened?: Array<{ name: string; description?: string }>;
  morphiusVersion?: string;
  tags?: string[];
  author?: string;
  provider?: ProviderMeta;
  workflowCompatible?: boolean;
  mockMode?: boolean;
  sandbox?: {
    hints?: string[];
    isolated?: boolean;
  };
}
