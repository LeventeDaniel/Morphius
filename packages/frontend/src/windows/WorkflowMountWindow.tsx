import { FloatingWindow } from './FloatingWindow.js';
import { useWindowStore } from '../store/windows.js';
import { usePluginStore } from '../store/plugins.js';
import type { WindowState } from '../store/windows.js';
import type { RecipeDTO } from '../api/client.js';

interface WorkflowMountWindowProps {
  window: WindowState;
}

export function WorkflowMountWindow({ window: win }: WorkflowMountWindowProps) {
  const { closeWindow, minimizeWindow, collapseWindow, bringToFront, moveWindow, openWindow } = useWindowStore();
  const { plugins } = usePluginStore();
  const recipe = win.data as RecipeDTO | undefined;

  const launchPlugins = () => {
    if (!recipe) return;
    recipe.requiredPlugins.forEach((pluginId, idx) => {
      const manifest = plugins.find((p) => p.id === pluginId);
      if (!manifest) return;
      openWindow({
        id: `module-${pluginId}-from-${recipe.id}`,
        title: manifest.name,
        type: 'module',
        source: 'demo',
        moduleId: manifest.id,
        contentKind: 'plugin-manifest',
        data: manifest,
        x: 160 + idx * 30,
        y: 160 + idx * 30,
        width: 380,
        height: 360,
      });
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
      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!recipe ? (
          <div style={mutedText}>NO RECIPE DATA</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 17, color: '#e8e8e8', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                {recipe.name}
              </span>
              <span style={{ fontSize: 13, color: '#555', fontFamily: 'var(--font-mono)', border: '1px solid #2a2a2a', padding: '1px 5px' }}>
                {recipe.id}
              </span>
            </div>

            {recipe.description && (
              <div style={{ fontSize: 15, color: '#888', lineHeight: 1.5 }}>{recipe.description}</div>
            )}

            {/* Layout badge */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={labelStyle}>LAYOUT</span>
              <span style={chipStyle}>{recipe.layout.toUpperCase()}</span>
            </div>

            {/* Required plugins */}
            <div>
              <div style={labelStyle}>REQUIRED PLUGINS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {recipe.requiredPlugins.map((id) => (
                  <span key={id} style={chipStyle}>{id}</span>
                ))}
              </div>
            </div>

            {/* Steps */}
            {recipe.defaultPanels.length > 0 && (
              <div>
                <div style={labelStyle}>PANELS / STEPS</div>
                {recipe.defaultPanels.map((panel, i) => (
                  <div key={panel.id} style={{ fontSize: 14, color: '#666', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                    {String(i + 1).padStart(2, '0')} · {panel.id} — {panel.pluginId}:{panel.blockId}
                  </div>
                ))}
              </div>
            )}

            {/* Launch */}
            <button onClick={launchPlugins} style={launchBtnStyle}>
              ▶ LAUNCH PLUGINS
            </button>

            {/* Footer */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid #1a1a1a', paddingTop: 6 }}>
              <span style={{ fontSize: 13, color: '#333', fontFamily: 'var(--font-mono)' }}>
                SOURCE: DEMO RECIPE
              </span>
            </div>
          </>
        )}
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
const launchBtnStyle: React.CSSProperties = {
  background: '#0d0d0d',
  border: '1px solid #3a3a3a',
  color: '#e8e8e8',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  letterSpacing: '0.1em',
  padding: '6px 14px',
  cursor: 'pointer',
  marginTop: 4,
  alignSelf: 'flex-start',
};
