import { useWindowStore } from '../store/windows.js';

interface WebtopDockProps {
  onToggleLauncher: () => void;
}

export function WebtopDock({ onToggleLauncher }: WebtopDockProps) {
  const { windows, bringToFront, restoreWindow, resetCanvas } = useWindowStore();

  const windowChips = windows;

  return (
    <div
      style={{
        width: 52,
        background: '#0d0d0d',
        borderRight: '1px solid #1e1e1e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px 0 8px',
        gap: 2,
        flexShrink: 0,
        zIndex: 900,
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 36,
          height: 36,
          border: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
          flexShrink: 0,
        }}
        title="MORPHIUS"
      >
        <span style={{ fontSize: 14, color: '#e8e8e8', fontFamily: 'var(--font-mono)' }}>M</span>
      </div>

      {/* Canvas reset */}
      <DockBtn title="RESET CANVAS" onClick={resetCanvas}>⊘</DockBtn>

      {/* Command launcher */}
      <DockBtn title="COMMAND LAUNCHER  [/]" onClick={onToggleLauncher}>⌘</DockBtn>

      {/* Divider */}
      <div style={{ width: 30, height: 1, background: '#1e1e1e', margin: '6px 0', flexShrink: 0 }} />

      {/* Open window chips */}
      {windowChips.map((win) => (
        <DockBtn
          key={win.id}
          title={win.title.toUpperCase()}
          onClick={() => win.state === 'minimized' ? restoreWindow(win.id) : bringToFront(win.id)}
          active
        >
          {win.title.slice(0, 2).toUpperCase()}
        </DockBtn>
      ))}
    </div>
  );
}

function DockBtn({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 36,
        height: 30,
        background: active ? '#161616' : 'transparent',
        border: active ? '1px solid #2a2a2a' : '1px solid transparent',
        color: active ? '#e8e8e8' : '#444',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        flexShrink: 0,
        transition: 'all 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#e8e8e8';
        e.currentTarget.style.background = '#161616';
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#444';
          e.currentTarget.style.background = 'transparent';
        } else {
          e.currentTarget.style.color = '#e8e8e8';
          e.currentTarget.style.background = '#161616';
        }
      }}
    >
      {children}
    </button>
  );
}
