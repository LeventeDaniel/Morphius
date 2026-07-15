import { useState, useEffect } from 'react';
import { FloatingWindow } from './FloatingWindow.js';
import { useWindowStore } from '../store/windows.js';
import { api } from '../api/client.js';
import type { WindowState } from '../store/windows.js';
import type { PluginManifestDTO, ExternalModuleDTO, CompatibilityLevel } from '../api/client.js';

interface ModuleMountWindowProps {
  window: WindowState;
}

type RunStatus = 'idle' | 'running' | 'error' | 'unavailable';
type PipelineStatus = 'idle' | 'bootstrapping' | 'mounting' | 'building' | 'ready' | 'error';

// ─── Compatibility level display ──────────────────────────────────────────────

const LEVEL_COLOR: Record<CompatibilityLevel, string> = {
  loadable:   '#444',
  usable:     '#4ade80',
  integrated: '#888',
  advanced:   '#888',
};

const LEVEL_LABEL: Record<CompatibilityLevel, string> = {
  loadable:   'LOADABLE',
  usable:     'USABLE',
  integrated: 'INTEGRATED',
  advanced:   'ADVANCED',
};

const KNOWN_PROVIDER_KINDS = new Set([
  'permission', 'approval', 'sandbox', 'audit',
  'policy', 'auth', 'execution', 'connection', 'generic',
]);

export function ModuleMountWindow({ window: win }: ModuleMountWindowProps) {
  const { closeWindow, collapseWindow, bringToFront, moveWindow } = useWindowStore();
  const manifest = win.data as PluginManifestDTO | ExternalModuleDTO | undefined;
  const [lastOutput, setLastOutput] = useState<Record<string, unknown> | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [backendLoaded, setBackendLoaded] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('idle');
  const [pipelineMsg, setPipelineMsg] = useState('');

  // Detect if this is an external module (has compatibilityLevel)
  const isExternal = manifest && 'compatibilityLevel' in manifest;
  const extManifest = isExternal ? (manifest as ExternalModuleDTO) : undefined;
  const coreManifest = !isExternal ? (manifest as PluginManifestDTO | undefined) : undefined;

  // Derive module id and whether it has a real backend / entry
  const moduleId = extManifest?.id ?? manifest?.id;
  const hasBackend = !!(extManifest as unknown as Record<string, unknown> | undefined)?.backendEntry;
  const hasEntry = !!(extManifest as unknown as Record<string, unknown> | undefined)?.entry;

  // Auto-pipeline: bootstrap Host + ModuleRuntime, mount this module, build bundle, show iframe.
  // Runs whenever a module window opens. All steps are idempotent.
  useEffect(() => {
    if (!moduleId) return;
    let cancelled = false;

    async function runPipeline() {
      setPipelineStatus('bootstrapping');
      setPipelineMsg('Starting Host + ModuleRuntime…');

      // Step 1: bootstrap Host and ModuleRuntime (idempotent)
      try {
        await api.host.bootstrap();
      } catch { /* bootstrap errors are non-fatal — Host may already be running */ }

      if (cancelled) return;

      // Step 2: mount this module into registry (idempotent)
      const folderPath = (extManifest as unknown as Record<string, unknown>)?._folderPath as string | undefined;
      if (folderPath) {
        setPipelineStatus('mounting');
        setPipelineMsg('Mounting module…');
        try { await api.plugins.mount(folderPath); } catch { /* already mounted */ }
      }

      if (cancelled) return;

      // Step 3: load this module's backend into Host (idempotent)
      if (hasBackend) {
        try {
          await api.host.load(moduleId!);
          if (!cancelled) setBackendLoaded(true);
        } catch { /* non-fatal — may already be loaded */ }
      }

      if (cancelled) return;

      // Step 4: if module has a UI entry, build and show iframe
      if (hasEntry) {
        setPipelineStatus('building');
        setPipelineMsg('Building UI bundle…');
        try {
          const buildResult = await api.runtime.build(moduleId!, true);
          if (!cancelled && buildResult.ok) {
            setIframeUrl(`${api.runtime.iframeUrl(moduleId!)}?t=${Date.now()}`);
            setPipelineStatus('ready');
            setPipelineMsg('');
          } else if (!cancelled) {
            setPipelineStatus('error');
            setPipelineMsg(buildResult.error ?? 'Build failed');
          }
        } catch (e) {
          if (!cancelled) {
            setPipelineStatus('error');
            setPipelineMsg(e instanceof Error ? e.message : 'Build error');
          }
        }
      } else {
        // Backend-only or metadata-only module — no iframe needed
        if (!cancelled) {
          setPipelineStatus('ready');
          setPipelineMsg('');
        }
      }
    }

    runPipeline();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const runAction = async (actionId: string) => {
    // External module with a backendEntry — dispatch through Host runtime
    if (isExternal && hasBackend && moduleId) {
      setRunStatus('running');
      setErrorMsg('');
      try {
        // Ensure backend is loaded before dispatching
        if (!backendLoaded) {
          await api.host.load(moduleId);
          setBackendLoaded(true);
        }
        const result = await api.host.dispatch(moduleId, actionId, {});
        setLastOutput(result.result as Record<string, unknown>);
        setRunStatus('idle');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setRunStatus('error');
      }
      return;
    }
    // External module with no backendEntry — metadata only
    if (isExternal) {
      setRunStatus('unavailable');
      setErrorMsg('Execution not available — this module has no backendEntry declared.');
      return;
    }
    // Core module — use legacy mock run
    if (!coreManifest) return;
    setRunStatus('running');
    setErrorMsg('');
    try {
      const result = await api.plugins.run(coreManifest.id, actionId, {});
      setLastOutput(result.output as Record<string, unknown>);
      setRunStatus('idle');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setRunStatus('error');
    }
  };

  const level: CompatibilityLevel = extManifest?.compatibilityLevel ?? 'integrated';
  const moduleType = extManifest?.type ?? 'core';
  const provider = extManifest?.provider;
  const isExperimentalType = extManifest && !['frontend', 'backend', 'fullstack', 'workflow', 'provider'].includes(extManifest.type);
  const isExperimentalProvider = provider && !KNOWN_PROVIDER_KINDS.has(provider.kind);

  const name = manifest?.name;
  const version = manifest?.version;
  const description = manifest?.description;
  const permissions = manifest?.permissions ?? [];
  const actions = manifest?.actions ?? [];

  // If the module declares a devUrl, mount it via iframe.
  // Morphius just points at the module's own running server — no file serving, no transformation.
  const moduleDevUrl = extManifest?.devUrl;
  const hasIframeUI = !!moduleDevUrl;

  return (
    <FloatingWindow
      window={win}
      onClose={() => closeWindow(win.id)}
      onCollapse={() => collapseWindow(win.id)}
      onFocus={() => bringToFront(win.id)}
      onMove={(x, y) => moveWindow(win.id, x, y)}
    >
      {/* ── pipeline loading state ── */}
      {hasEntry && pipelineStatus !== 'ready' && pipelineStatus !== 'error' && !iframeUrl && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10, background: '#111', color: '#555', fontFamily: 'var(--font-mono)', fontSize: 13,
        }}>
          <span style={{ letterSpacing: '0.12em' }}>
            {pipelineStatus === 'bootstrapping' ? '○ STARTING RUNTIME…'
              : pipelineStatus === 'mounting' ? '○ MOUNTING MODULE…'
              : pipelineStatus === 'building' ? '○ BUILDING UI…'
              : '○ INITIALISING…'}
          </span>
          {pipelineMsg && <span style={{ color: '#333', fontSize: 12 }}>{pipelineMsg}</span>}
        </div>
      )}

      {/* ── pipeline error (no iframe fallback) ── */}
      {hasEntry && pipelineStatus === 'error' && !iframeUrl && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, background: '#111', color: '#f87171', fontFamily: 'var(--font-mono)', fontSize: 13, padding: 16,
        }}>
          <span>UI BUILD FAILED</span>
          {pipelineMsg && <span style={{ color: '#666', fontSize: 12, textAlign: 'center' }}>{pipelineMsg}</span>}
        </div>
      )}

      {/* ── runtime iframe: module UI bundled and served by ModuleRuntime ── */}
      {iframeUrl ? (
        <iframe
          src={iframeUrl}
          style={{ flex: 1, width: '100%', height: '100%', border: 'none', background: '#111', display: 'block' }}
          title={name ?? 'module'}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      ) : null}

      {/* ── devUrl iframe: module owns its UI and runs its own dev server ── */}
      {!iframeUrl && hasIframeUI && pipelineStatus === 'ready' ? (
        <iframe
          src={moduleDevUrl}
          style={{ flex: 1, width: '100%', height: '100%', border: 'none', background: '#111', display: 'block' }}
          title={name ?? 'module'}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      ) : null}

      {/* ── metadata view: shown for backend-only / metadata-only modules ── */}
      {!iframeUrl && !hasIframeUI && !hasEntry && (
      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        {!manifest ? (
          <div style={mutedText}>NO MANIFEST DATA</div>
        ) : (
          <>
            {/* Header row: name + version + compatibility badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, color: '#e8e8e8', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', flexShrink: 0 }}>
                {name}
              </span>
              <span style={{ fontSize: 13, color: '#555', fontFamily: 'var(--font-mono)', border: '1px solid #2a2a2a', padding: '1px 5px' }}>
                v{version}
              </span>
              {/* Compatibility level badge */}
              {isExternal && (
                <span style={{
                  fontSize: 11,
                  color: LEVEL_COLOR[level],
                  fontFamily: 'var(--font-mono)',
                  border: `1px solid ${LEVEL_COLOR[level]}33`,
                  padding: '1px 5px',
                  letterSpacing: '0.08em',
                }}>
                  {LEVEL_LABEL[level]}
                </span>
              )}
              {/* Module type chip */}
              <span style={{ fontSize: 11, color: '#444', fontFamily: 'var(--font-mono)', border: '1px solid #1e1e1e', padding: '1px 5px' }}>
                {moduleType.toUpperCase()}
                {isExperimentalType ? ' (EXPERIMENTAL)' : ''}
              </span>
            </div>

            {/* Description */}
            {description && (
              <div style={{ fontSize: 15, color: '#888', lineHeight: 1.5 }}>{description}</div>
            )}
            {!description && isExternal && (
              <div style={{ fontSize: 14, color: '#333', fontFamily: 'var(--font-mono)', fontStyle: 'italic' }}>
                No description provided.
              </div>
            )}

            {/* Capabilities (core modules only) */}
            {coreManifest && coreManifest.capabilities.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {coreManifest.capabilities.map((cap) => (
                  <span key={cap} style={chipStyle}>{cap.toUpperCase()}</span>
                ))}
              </div>
            )}

            {/* Source info for external modules */}
            {extManifest && (
              <div style={{ fontSize: 13, color: '#333', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                SOURCE: {extManifest.sourceLabel} · {extManifest.manifestKind.toUpperCase()}
                {extManifest.author ? ` · BY ${extManifest.author.toUpperCase()}` : ''}
                {extManifest.mockMode ? ' · MOCK MODE' : ''}
              </div>
            )}

            {/* Warnings */}
            {extManifest && extManifest.warnings.length > 0 && (
              <div>
                <div style={labelStyle}>WARNINGS</div>
                {extManifest.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 14, color: '#666', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    ⚠ {w}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {extManifest && extManifest.recommendations.length > 0 && (
              <div>
                <div style={labelStyle}>RECOMMENDATIONS</div>
                {extManifest.recommendations.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#555', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    · {r}
                  </div>
                ))}
              </div>
            )}

            {/* Permissions */}
            {permissions.length > 0 && (
              <div>
                <div style={labelStyle}>PERMISSIONS</div>
                {permissions.map((p) => (
                  <div key={p} style={{ fontSize: 14, color: '#666', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    · {p}
                  </div>
                ))}
              </div>
            )}

            {/* Connect references */}
            {extManifest && extManifest.connectors.length > 0 && (
              <div>
                <div style={labelStyle}>CONNECT REFERENCES</div>
                {extManifest.connectors.map((c) => (
                  <div key={c.name} style={{ fontSize: 14, color: '#666', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    · {c.name}{c.description ? ` — ${c.description}` : ''}
                  </div>
                ))}
              </div>
            )}

            {/* Secret refs */}
            {extManifest && extManifest.secretRefs.length > 0 && (
              <div>
                <div style={labelStyle}>SECRET REFERENCES (names only)</div>
                {extManifest.secretRefs.map((s) => (
                  <div key={s.name} style={{ fontSize: 14, color: '#888', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    · {s.name}
                  </div>
                ))}
              </div>
            )}

            {/* Provider metadata */}
            {provider && (
              <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 6 }}>
                <div style={labelStyle}>PROVIDER ROLE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{
                    fontSize: 13,
                    color: isExperimentalProvider ? '#666' : '#888',
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid #2a2a2a',
                    padding: '1px 5px',
                  }}>
                    {provider.kind.toUpperCase()}{isExperimentalProvider ? ' (EXPERIMENTAL)' : ''}
                  </span>
                </div>
                {provider.handles && provider.handles.length > 0 && (
                  <div style={{ fontSize: 13, color: '#555', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    HANDLES: {provider.handles.join(', ')}
                  </div>
                )}
                {provider.decisions && provider.decisions.length > 0 && (
                  <div style={{ fontSize: 13, color: '#555', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    DECISIONS: {provider.decisions.join(', ')}
                  </div>
                )}
                <div style={{ fontSize: 13, color: '#333', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  Provider metadata is displayed only. No execution is automatic.
                </div>
              </div>
            )}

            {/* Workflow compat */}
            {extManifest && typeof extManifest.workflowCompatible === 'boolean' && (
              <div style={{ fontSize: 13, color: '#555', fontFamily: 'var(--font-mono)' }}>
                WORKFLOW COMPATIBLE: {extManifest.workflowCompatible ? 'YES' : 'NO'}
              </div>
            )}

            {/* Tags */}
            {extManifest && extManifest.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {extManifest.tags.map((t) => (
                  <span key={t} style={{ ...chipStyle, color: '#555', borderColor: '#1e1e1e' }}>{t}</span>
                ))}
              </div>
            )}

            {/* Actions */}
            {actions.length > 0 && (
              <div>
                <div style={labelStyle}>ACTIONS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => runAction(action.id)}
                      disabled={runStatus === 'running'}
                      title={(action as { description?: string }).description ?? action.name}
                      style={actionBtnStyle}
                    >
                      ▶ {action.name.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Execution status notice */}
            {isExternal && actions.length > 0 && (
              <div style={{ fontSize: 13, color: hasBackend ? '#2a4a2a' : '#333', fontFamily: 'var(--font-mono)', borderTop: '1px solid #1a1a1a', paddingTop: 4 }}>
                {hasBackend
                  ? (backendLoaded ? '● BACKEND LOADED — actions execute via Host runtime' : '○ LOADING BACKEND…')
                  : 'No backendEntry declared — actions are metadata only.'}
              </div>
            )}

            {/* Status dot + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: runStatus === 'idle' ? '#4ade80'
                  : runStatus === 'running' ? '#555'
                  : runStatus === 'unavailable' ? '#333'
                  : '#f87171',
              }} />
              <span style={{ fontSize: 13, color: '#555', fontFamily: 'var(--font-mono)' }}>
                {runStatus.toUpperCase()}
              </span>
            </div>

            {/* Error / unavailable message */}
            {(errorMsg || runStatus === 'unavailable') && (
              <div style={{ fontSize: 14, color: runStatus === 'unavailable' ? '#555' : '#f87171', fontFamily: 'var(--font-mono)' }}>
                {errorMsg || 'EXECUTION NOT AVAILABLE'}
              </div>
            )}

            {/* Output */}
            {lastOutput !== null && (
              <div>
                <div style={labelStyle}>LAST OUTPUT</div>
                <pre style={{
                  fontSize: 14, color: '#888', background: '#0a0a0a',
                  border: '1px solid #2a2a2a', padding: 8, margin: '4px 0 0',
                  overflow: 'auto', maxHeight: 120, fontFamily: 'var(--font-mono)',
                }}>
                  {JSON.stringify(lastOutput, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid #1a1a1a', paddingTop: 6 }}>
          <span style={{ fontSize: 13, color: '#333', fontFamily: 'var(--font-mono)' }}>
            SOURCE: {win.source.toUpperCase()} MODULE
          </span>
        </div>
      </div>
      )}
    </FloatingWindow>
  );
}

const mutedText: React.CSSProperties = { fontSize: 15, color: '#444', fontFamily: 'var(--font-mono)' };
const labelStyle: React.CSSProperties = { fontSize: 13, color: '#444', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 2 };
const chipStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#888',
  fontFamily: 'var(--font-mono)',
  border: '1px solid #2a2a2a',
  padding: '2px 6px',
  letterSpacing: '0.05em',
};
const actionBtnStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #2a2a2a',
  color: '#e8e8e8',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  letterSpacing: '0.08em',
  padding: '4px 10px',
  cursor: 'pointer',
  textAlign: 'left',
};
