import { useState } from 'react';
import { usePluginStore } from '../store/plugins.js';
import { useSessionStore } from '../store/session.js';
import { api } from '../api/client.js';

interface PluginBlockProps {
  pluginId: string;
  blockId: string;
}

export function PluginBlock({ pluginId, blockId }: PluginBlockProps) {
  const { getPlugin, setStatus, setError } = usePluginStore();
  const { addOutput, addAuditEvent } = useSessionStore();
  const plugin = getPlugin(pluginId);
  const [lastOutput, setLastOutput] = useState<Record<string, unknown> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [inputValue, setInputValue] = useState('');

  if (!plugin) {
    return (
      <div
        style={{
          color: 'var(--status-warn)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          padding: 4,
        }}
      >
        PLUGIN NOT LOADED: {pluginId}
        <br />
        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
          Ensure the backend has this plugin registered.
        </span>
      </div>
    );
  }

  const block = plugin.uiBlocks.find((b) => b.id === blockId);
  const defaultAction = plugin.actions[0];

  const handleRun = async () => {
    if (!defaultAction || isRunning) return;
    setIsRunning(true);
    setStatus(pluginId, 'running');

    try {
      const result = await api.plugins.run(pluginId, defaultAction.id, { query: inputValue });
      setLastOutput(result.output as Record<string, unknown>);
      setStatus(pluginId, 'idle');

      const output = {
        id: `out-${Date.now()}`,
        pluginId,
        action: defaultAction.id,
        output: result.output,
        timestamp: result.executedAt,
        status: 'ok' as const,
      };
      addOutput(output);

      // Log audit event
      addAuditEvent({
        id: `audit-block-${Date.now()}`,
        timestamp: result.executedAt,
        source: pluginId,
        action: defaultAction.id,
        payload: { blockId, input: inputValue },
        status: 'ok',
        sessionId: 'default',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(pluginId, msg);
      setStatus(pluginId, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Block header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 8,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <span style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
            {plugin.name.toUpperCase()}
          </span>
          {block && (
            <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 10 }}>
              [{block.role.toUpperCase()}]
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '1px 5px',
            letterSpacing: '0.06em',
          }}
        >
          MOCK
        </span>
      </div>

      {/* Capabilities */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {plugin.capabilities.slice(0, 4).map((cap) => (
          <span
            key={cap}
            style={{
              fontSize: 9,
              color: 'var(--text-muted)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              padding: '1px 5px',
              letterSpacing: '0.05em',
            }}
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Input + run */}
      {defaultAction && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRun()}
            placeholder={`${defaultAction.name.toLowerCase()}...`}
            style={{
              flex: 1,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              padding: '4px 8px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleRun}
            disabled={isRunning}
            style={{
              background: isRunning ? 'var(--bg-secondary)' : 'var(--bg-panel-hover)',
              border: '1px solid var(--border-accent)',
              borderRadius: 4,
              color: isRunning ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: isRunning ? 'default' : 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '4px 10px',
              letterSpacing: '0.06em',
              transition: 'all 0.12s',
            }}
          >
            {isRunning ? 'RUNNING...' : 'RUN ↵'}
          </button>
        </div>
      )}

      {/* Output */}
      {lastOutput && (
        <div
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: 8,
            overflow: 'auto',
            fontSize: 10,
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ color: 'var(--status-ok)', marginRight: 6 }}>●</span>
          <pre style={{ display: 'inline', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(lastOutput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
