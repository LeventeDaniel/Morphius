import { useState, useRef, useEffect } from 'react';
import { FloatingWindow } from './FloatingWindow.js';
import { useWindowStore } from '../store/windows.js';
import { api } from '../api/client.js';
import type { WindowState } from '../store/windows.js';
import type { MountedModuleDTO } from '../api/client.js';

interface Props {
  window: WindowState;
}

export function ModuleLoaderWindow({ window: win }: Props) {
  const [path, setPath] = useState('');
  const [phase, setPhase] = useState<'input' | 'loading' | 'results' | 'error'>('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [module, setModule] = useState<MountedModuleDTO | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { closeWindow, minimizeWindow, collapseWindow, bringToFront, moveWindow, openWindow } = useWindowStore();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const load = async () => {
    const trimmed = path.trim();
    if (!trimmed) return;
    setPhase('loading');
    setErrorMsg('');
    setWarnings([]);
    try {
      const res = await api.plugins.mount(trimmed);
      if (!res.ok) {
        setPhase('error');
        setErrorMsg(res.error ?? 'Mount failed');
        return;
      }
      setModule(res.module ?? null);
      setWarnings(res.warnings ?? []);
      setPhase('results');
    } catch (err) {
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : 'Mount failed');
    }
  };

  const openModule = (mod: MountedModuleDTO) => {
    openWindow({
      id: `ext-${mod.id}`,
      title: mod.name.toUpperCase(),
      type: 'module',
      source: 'external',
      moduleId: mod.id,
      x: win.x + 40,
      y: win.y + 40,
      width: mod.window?.defaultWidth ?? 480,
      height: mod.window?.defaultHeight ?? 460,
      contentKind: 'plugin-manifest',
      data: {
        ...mod,
        capabilities: mod.permissions,
        uiBlocks: [],
        emits: [],
        listensTo: [],
        standaloneMode: false,
        mainAppIntegration: true,
      },
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') load();
    if (e.key === 'Escape') closeWindow(win.id);
  };

  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 14 };
  const dim: React.CSSProperties = { ...mono, color: '#333' };

  return (
    <FloatingWindow
      window={win}
      onClose={() => closeWindow(win.id)}
      onMinimize={() => minimizeWindow(win.id)}
      onCollapse={() => collapseWindow(win.id)}
      onFocus={() => bringToFront(win.id)}
      onMove={(x, y) => moveWindow(win.id, x, y)}
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d0d0d' }}>

        <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...dim, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Module folder path
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              border: '1px solid #2a2a2a', background: '#111',
              padding: '0 8px', height: 36, gap: 6,
            }}>
              <span style={{ color: '#3a3a3a', fontSize: 17, flexShrink: 0 }}>›</span>
              <input
                ref={inputRef}
                value={path}
                onChange={(e) => { setPath(e.target.value); if (phase !== 'input') setPhase('input'); }}
                onKeyDown={handleKey}
                placeholder="C:\path\to\module"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#c8c8c8', fontFamily: 'var(--font-mono)', fontSize: 15,
                  caretColor: '#4ade80',
                }}
              />
            </div>
            <button
              onClick={load}
              disabled={!path.trim() || phase === 'loading'}
              style={{
                ...mono, height: 36, padding: '0 12px',
                background: '#111', border: '1px solid #2a2a2a',
                color: path.trim() ? '#888' : '#2a2a2a',
                cursor: path.trim() && phase !== 'loading' ? 'pointer' : 'default',
                letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
              }}
            >
              {phase === 'loading' ? '…' : 'load'}
            </button>
          </div>
          <div style={{ ...dim, fontSize: 13 }}>
            Folder must contain manifest.json — no files are moved or copied.
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>

          {phase === 'loading' && (
            <div style={{ ...dim, fontSize: 14, padding: '12px 0' }}>scanning…</div>
          )}

          {phase === 'error' && (
            <div style={{ ...mono, color: '#7a3a3a', padding: '12px 0' }}>{errorMsg}</div>
          )}

          {phase === 'results' && !module && (
            <div style={{ ...dim, padding: '12px 0' }}>
              path registered — no valid manifest found.<br />
              <span style={{ fontSize: 13 }}>Make sure a manifest.json exists in that folder.</span>
            </div>
          )}

          {phase === 'results' && module && (
            <>
              {warnings.length > 0 && (
                <div style={{ ...mono, fontSize: 13, color: '#666', marginBottom: 4 }}>
                  {warnings.map((w, i) => <div key={i}>{w}</div>)}
                </div>
              )}
              <div style={{
                border: '1px solid #1a1a1a', background: '#111',
                padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ ...mono, fontSize: 15, color: '#c8c8c8' }}>{module.name}</span>
                    <span style={{ ...dim, fontSize: 13, border: '1px solid #1e1e1e', padding: '0 4px' }}>v{module.version}</span>
                    <span style={{ ...dim, fontSize: 13, border: '1px solid #1e1e1e', padding: '0 4px' }}>{module.type}</span>
                  </div>
                  {module.description && (
                    <div style={{ ...dim, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {module.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openModule(module)}
                  style={{
                    ...mono, height: 30, padding: '0 10px',
                    background: 'transparent', border: '1px solid #2a2a2a',
                    color: '#888', cursor: 'pointer', flexShrink: 0,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#e8e8e8'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#444'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#888'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'; }}
                >
                  open
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </FloatingWindow>
  );
}
