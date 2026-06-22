import { useSessionStore } from '../store/session.js';

export function WebtopTopbar() {
  const { sessionId } = useSessionStore();

  return (
    <div
      style={{
        height: 30,
        background: '#111111',
        borderBottom: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 16,
        flexShrink: 0,
        zIndex: 1000,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.2em',
          color: '#e8e8e8',
        }}
      >
        MORPHIUS
      </span>
      <span style={{ color: '#2a2a2a', fontSize: 10 }}>|</span>
      <span style={{ fontSize: 9, color: '#444', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
        WEBTOP
      </span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 9, color: '#333', fontFamily: 'var(--font-mono)' }}>
        {sessionId}
      </span>
    </div>
  );
}
