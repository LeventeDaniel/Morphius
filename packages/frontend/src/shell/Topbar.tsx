import { useWorkspaceStore } from '../store/workspace.js';
import { useSessionStore } from '../store/session.js';

const LayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export function Topbar() {
  const { mode, activeRecipe } = useWorkspaceStore();
  const { sessionId } = useSessionStore();

  return (
    <div
      style={{
        height: 40,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
      }}
    >
      {/* Left: App name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.15em',
            color: 'var(--accent)',
          }}
        >
          MORPHIUS
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '1px 6px',
            letterSpacing: '0.08em',
          }}
        >
          v0.1.0
        </span>
      </div>

      {/* Center: session info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--text-secondary)' }}>
        <span>
          SESSION{' '}
          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {sessionId.slice(0, 16)}
          </span>
        </span>
        {activeRecipe && (
          <>
            <span style={{ color: 'var(--border-accent)' }}>·</span>
            <span>
              RECIPE{' '}
              <span style={{ color: 'var(--status-ok)' }}>
                {activeRecipe.name.toUpperCase()}
              </span>
            </span>
          </>
        )}
        <span style={{ color: 'var(--border-accent)' }}>·</span>
        <span>
          MODE{' '}
          <span style={{ color: 'var(--accent-dim)' }}>{mode.toUpperCase()}</span>
        </span>
      </div>

      {/* Right: layout toggle */}
      <button
        title="Toggle Layout"
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 4,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: '4px 6px',
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-accent)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        }}
      >
        <LayoutIcon />
      </button>
    </div>
  );
}
