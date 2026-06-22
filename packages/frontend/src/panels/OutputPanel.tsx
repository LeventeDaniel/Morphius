import { useSessionStore } from '../store/session.js';

export function OutputPanel() {
  const { outputs, clearOutputs, currentTask } = useSessionStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.1em' }}>
          OUTPUT STREAM ({outputs.length})
        </span>
        {outputs.length > 0 && (
          <button
            onClick={clearOutputs}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Current task */}
      {currentTask && (
        <div
          style={{
            padding: '4px 8px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-accent)',
            borderRadius: 4,
            marginBottom: 8,
            fontSize: 10,
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>TASK › </span>
          {currentTask}
        </div>
      )}

      {/* Outputs */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {outputs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            No output yet. Run a plugin or submit a command.
          </div>
        ) : (
          [...outputs].reverse().map((out) => (
            <div
              key={out.id}
              style={{
                padding: '6px 8px',
                background: 'var(--bg-primary)',
                border: `1px solid ${out.status === 'error' ? 'var(--status-error)' : 'var(--border)'}`,
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 4,
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                }}
              >
                <span style={{ color: out.status === 'ok' ? 'var(--status-ok)' : 'var(--status-error)' }}>
                  ●
                </span>
                <span>{out.pluginId}</span>
                <span>›</span>
                <span>{out.action}</span>
                <span style={{ marginLeft: 'auto' }}>
                  {new Date(out.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre
                style={{
                  margin: 0,
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  overflow: 'hidden',
                  maxHeight: 80,
                }}
              >
                {JSON.stringify(out.output, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
