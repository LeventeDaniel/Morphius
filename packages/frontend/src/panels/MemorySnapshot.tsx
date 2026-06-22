import { useSessionStore } from '../store/session.js';
import { useWorkspaceStore } from '../store/workspace.js';

interface MemoryEntry {
  key: string;
  value: string;
  ttl?: string;
}

export function MemorySnapshot() {
  const { currentTask, sessionId } = useSessionStore();
  const { mode, activeRecipe } = useWorkspaceStore();

  // Simulate memory entries
  const entries: MemoryEntry[] = [
    { key: 'session.id', value: sessionId.slice(0, 20) + '...' },
    { key: 'workspace.mode', value: mode },
    { key: 'workspace.recipe', value: activeRecipe?.id ?? 'none' },
    { key: 'task.last', value: currentTask || '(none)', ttl: '5m' },
    { key: 'context.size', value: '128K tokens' },
    { key: 'model.id', value: 'morphius-core' },
  ];

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
        MEMORY SNAPSHOT
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {entries.map((entry) => (
          <div
            key={entry.key}
            style={{
              display: 'flex',
              gap: 8,
              padding: '3px 0',
              borderBottom: '1px solid var(--border)',
              alignItems: 'baseline',
            }}
          >
            <span style={{ color: 'var(--text-secondary)', flexShrink: 0, minWidth: 120 }}>
              {entry.key}
            </span>
            <span style={{ color: 'var(--accent-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.value}
            </span>
            {entry.ttl && (
              <span style={{ color: 'var(--text-muted)', fontSize: 9, flexShrink: 0 }}>
                TTL:{entry.ttl}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
