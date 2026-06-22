import { useState, useEffect } from 'react';
import { FloatingWindow } from './FloatingWindow.js';
import { useWindowStore } from '../store/windows.js';
import { api } from '../api/client.js';
import type { WindowState, WindowState as WS } from '../store/windows.js';
import type { PluginManifestDTO } from '../api/client.js';

interface ProvidersListWindowProps {
  window: WindowState;
}

export function ProvidersListWindow({ window: win }: ProvidersListWindowProps) {
  const { closeWindow, minimizeWindow, collapseWindow, bringToFront, moveWindow, openWindow } = useWindowStore();
  const [providers, setProviders] = useState<PluginManifestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.plugins.list()
      .then((res) => {
        setProviders(res.plugins);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load plugins');
        setLoading(false);
      });
  }, []);

  const openPlugin = (plugin: PluginManifestDTO) => {
    const partial: Omit<WS, 'zIndex' | 'state'> = {
      id: `provider-${plugin.id}`,
      title: plugin.name,
      type: 'module',
      source: 'module',
      moduleId: plugin.id,
      contentKind: 'plugin-manifest',
      data: plugin,
      x: 260, y: 160, width: 440, height: 480,
    };
    openWindow(partial);
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
      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        <div style={{ fontSize: 13, color: '#444', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 4 }}>
          LOADED PLUGINS
        </div>
        <div style={{ fontSize: 14, color: '#333', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
          All plugins registered in this Morphius instance.
        </div>

        {loading && <div style={{ fontSize: 14, color: '#555', fontFamily: 'var(--font-mono)' }}>LOADING…</div>}
        {error && <div style={{ fontSize: 14, color: '#f87171', fontFamily: 'var(--font-mono)' }}>ERROR: {error}</div>}

        {!loading && !error && providers.length === 0 && (
          <div style={{ fontSize: 14, color: '#444', fontFamily: 'var(--font-mono)' }}>
            No plugins loaded. Use "load module" to mount a module from a folder path.
          </div>
        )}

        {providers.map((plugin) => (
          <div
            key={plugin.id}
            style={{
              border: '1px solid #1e1e1e',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              cursor: 'pointer',
            }}
            onClick={() => openPlugin(plugin)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, color: '#e8e8e8', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', flex: 1 }}>
                {plugin.name}
              </span>
              <span style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', border: '1px solid #2a2a2a', padding: '1px 4px' }}>
                v{plugin.version}
              </span>
            </div>
            {plugin.description && (
              <div style={{ fontSize: 14, color: '#666', lineHeight: 1.4 }}>{plugin.description}</div>
            )}
          </div>
        ))}

        <div style={{ marginTop: 'auto', borderTop: '1px solid #1a1a1a', paddingTop: 6 }}>
          <span style={{ fontSize: 13, color: '#333', fontFamily: 'var(--font-mono)' }}>
            TOTAL: {providers.length} PLUGIN{providers.length !== 1 ? 'S' : ''}
          </span>
        </div>
      </div>
    </FloatingWindow>
  );
}
