import { useState } from 'react';
import { FloatingWindow } from './FloatingWindow.js';
import { useWindowStore } from '../store/windows.js';
import { api } from '../api/client.js';
import type { WindowState } from '../store/windows.js';
import type { PluginManifestDTO, ExternalModuleDTO, CompatibilityLevel } from '../api/client.js';

interface ModuleMountWindowProps {
  window: WindowState;
}

type RunStatus = 'idle' | 'running' | 'error' | 'unavailable';

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
  const { closeWindow, minimizeWindow, collapseWindow, bringToFront, moveWindow } = useWindowStore();
  const manifest = win.data as PluginManifestDTO | ExternalModuleDTO | undefined;
  const [lastOutput, setLastOutput] = useState<Record<string, unknown> | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Detect if this is an external module (has compatibilityLevel)
  const isExternal = manifest && 'compatibilityLevel' in manifest;
  const extManifest = isExternal ? (manifest as ExternalModuleDTO) : undefined;
  const coreManifest = !isExternal ? (manifest as PluginManifestDTO | undefined) : undefined;

  const runAction = async (actionId: string) => {
    if (isExternal) {
      setRunStatus('unavailable');
      setErrorMsg('Execution not available — external module actions require an execution provider. No code is run automatically.');
      return;
    }
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

  return (
    <FloatingWindow
      window={win}
      onClose={() => closeWindow(win.id)}
      onMinimize={() => minimizeWindow(win.id)}
      onCollapse={() => collapseWindow(win.id)}
      onFocus={() => bringToFront(win.id)}
      onMove={(x, y) => moveWindow(win.id, x, y)}
    >
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

            {/* Execution unavailable notice (external modules) */}
            {isExternal && actions.length > 0 && (
              <div style={{ fontSize: 13, color: '#333', fontFamily: 'var(--font-mono)', borderTop: '1px solid #1a1a1a', paddingTop: 4 }}>
                External module execution requires a provider. Actions are displayed as metadata only.
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
