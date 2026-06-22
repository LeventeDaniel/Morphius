import { useWindowStore } from '../store/windows.js';

export function WebtopStatusBar() {
  const { windows, restoreWindow } = useWindowStore();
  const minimized = windows.filter((w) => w.state === 'minimized');

  return (
    <div
      style={{
        height: 30,
        background: 'var(--bg-deep)',
        borderTop: '1px solid var(--bg-titlebar)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        gap: 8,
        flexShrink: 0,
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Minimized window chips */}
      {minimized.map((win) => (
        <button
          key={win.id}
          onClick={() => restoreWindow(win.id)}
          title={`Restore: ${win.title}`}
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            letterSpacing: '0.08em',
            padding: '2px 8px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          {win.title.length > 14 ? win.title.slice(0, 14) + '…' : win.title}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Window count */}
      <span style={{ fontSize: 13, color: 'var(--border)', fontFamily: 'var(--font-mono)' }}>
        WINDOWS: {windows.filter((w) => w.state !== 'minimized').length}
      </span>
      <span style={{ color: 'var(--border-subtle)', fontSize: 13 }}>·</span>
      <span
        style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--status-ok)', flexShrink: 0 }}
      />
    </div>
  );
}
