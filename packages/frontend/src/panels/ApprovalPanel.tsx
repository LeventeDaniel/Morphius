import { useSessionStore } from '../store/session.js';

export function ApprovalPanel() {
  const { approvals, resolveApproval } = useSessionStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
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
        PENDING APPROVALS ({approvals.length})
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {approvals.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            No pending approvals.
          </div>
        ) : (
          approvals.map((approval) => (
            <div
              key={approval.id}
              style={{
                padding: '8px 10px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--status-warn)',
                borderRadius: 4,
              }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ color: 'var(--status-warn)' }}>⚠</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                  {approval.pluginId}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  requests <strong style={{ color: 'var(--text-primary)' }}>{approval.permission}</strong>
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 8 }}>
                {approval.reason}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => resolveApproval(approval.id)}
                  style={{
                    background: 'var(--status-ok)',
                    border: 'none',
                    borderRadius: 4,
                    color: 'var(--bg-primary)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    padding: '3px 10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                  }}
                >
                  APPROVE
                </button>
                <button
                  onClick={() => resolveApproval(approval.id)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--status-error)',
                    borderRadius: 4,
                    color: 'var(--status-error)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    padding: '3px 10px',
                    letterSpacing: '0.06em',
                  }}
                >
                  DENY
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
