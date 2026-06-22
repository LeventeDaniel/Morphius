import { useSessionStore } from '../store/session.js';

const STATUS_COLOR: Record<string, string> = {
  ok: 'var(--status-ok)',
  error: 'var(--status-error)',
  pending: 'var(--status-warn)',
};

export function AuditLog() {
  const { auditEvents } = useSessionStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
      <div
        style={{
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: '1px solid var(--border)',
        }}
      >
        AUDIT LOG ({auditEvents.length} EVENTS)
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {auditEvents.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>
            No audit events yet.
          </div>
        ) : (
          auditEvents.map((evt) => (
            <div
              key={evt.id}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                padding: '3px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ color: STATUS_COLOR[evt.status] ?? 'var(--text-muted)', flexShrink: 0 }}>●</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 9, flexShrink: 0 }}>
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
              <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                [{evt.source}]
              </span>
              <span style={{ color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {evt.action}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
