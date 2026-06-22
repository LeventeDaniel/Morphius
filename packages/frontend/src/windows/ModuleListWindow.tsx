import { useEffect, useState } from 'react';
import { FloatingWindow } from './FloatingWindow.js';
import { useWindowStore } from '../store/windows.js';
import { api } from '../api/client.js';
import type { WindowState } from '../store/windows.js';
import type { PluginManifestDTO } from '../api/client.js';

interface ModuleListWindowProps {
  window: WindowState;
}

export function ModuleListWindow({ window: win }: ModuleListWindowProps) {
  const { closeWindow, minimizeWindow, collapseWindow, bringToFront, moveWindow, openWindow } = useWindowStore();
  const [plugins, setPlugins] = useState<PluginManifestDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.plugins.list().then((res) => {
      setPlugins(res.plugins);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const openPlugin = (p: PluginManifestDTO) => {
    openWindow({
      id: `module-${p.id}`,
      title: p.name,
      type: 'module',
      source: 'module',
      moduleId: p.id,
      contentKind: 'plugin-manifest',
      data: p,
      x: 200,
      y: 200,
      width: 380,
      height: 380,
    });
  };

  return (
    <FloatingWindow
      window={win}
      onClose={() => closeWindow(win.id)}
      onMinimize={() => minimizeWindow(win.id)}
      onCollapse={() => collapseWindow(win.id)}
      onFocus={() => bringToFront(win.id)}
      onMove={(x, y) => moveWindow(win.id, x, y)}
    >
      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={labelStyle}>LOADED PLUGINS ({loading ? '…' : plugins.length})</div>
        {loading && <div style={mutedText}>LOADING...</div>}
        {!loading && plugins.length === 0 && <div style={mutedText}>NO PLUGINS FOUND</div>}
        {plugins.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 8px',
              border: '1px solid #1e1e1e',
              background: '#0d0d0d',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, color: '#e8e8e8', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 13, color: '#444', fontFamily: 'var(--font-mono)' }}>
                v{p.version} · {p.capabilities.length} caps
              </div>
            </div>
            <button onClick={() => openPlugin(p)} style={openBtnStyle}>OPEN</button>
          </div>
        ))}
      </div>
    </FloatingWindow>
  );
}

const mutedText: React.CSSProperties = { fontSize: 15, color: '#444', fontFamily: 'var(--font-mono)' };
const labelStyle: React.CSSProperties = { fontSize: 13, color: '#444', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 2 };
const openBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #2a2a2a',
  color: '#888',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  letterSpacing: '0.08em',
  padding: '3px 8px',
  cursor: 'pointer',
  flexShrink: 0,
};
