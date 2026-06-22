import { usePluginStore } from '../store/plugins.js';

export function ActivePlugins() {
  const { plugins, statuses, isLoading } = usePluginStore();

  if (isLoading) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        LOADING PLUGINS...
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        NO PLUGINS LOADED
        <br />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
          Check backend connection on :7900
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-mono)' }}>
      <div
        style={{
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          marginBottom: 4,
        }}
      >
        {plugins.length} PLUGINS REGISTERED
      </div>
      {plugins.map((plugin) => {
        const status = statuses[plugin.id] ?? 'idle';
        const statusColor =
          status === 'running'
            ? 'var(--status-warn)'
            : status === 'error'
            ? 'var(--status-error)'
            : 'var(--status-ok)';

        return (
          <div
            key={plugin.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 8px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontSize: 10,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusColor,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
              {plugin.id}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>
              v{plugin.version}
            </span>
            <span
              style={{
                color: statusColor,
                fontSize: 9,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
