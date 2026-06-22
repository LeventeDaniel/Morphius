import { useState, useEffect } from 'react';
import { usePluginStore } from '../store/plugins.js';
import { useSessionStore } from '../store/session.js';

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1, height: 10 }}>
      {[0.3, 0.5, 0.7, 1.0].map((threshold, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${(i + 1) * 2.5}px`,
            background: value / 100 >= threshold ? color : 'var(--border-accent)',
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

export function StatusBar() {
  const { plugins } = usePluginStore();
  const { isProcessing } = useSessionStore();
  const [metrics, setMetrics] = useState({ cpu: 12, mem: 34, net: 5 });

  // Simulate drifting metrics
  useEffect(() => {
    const id = setInterval(() => {
      setMetrics((prev) => ({
        cpu: Math.max(5, Math.min(90, prev.cpu + (Math.random() - 0.5) * 8)),
        mem: Math.max(20, Math.min(85, prev.mem + (Math.random() - 0.5) * 4)),
        net: Math.max(0, Math.min(100, prev.net + (Math.random() - 0.5) * 15)),
      }));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        height: 32,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
        letterSpacing: '0.06em',
      }}
    >
      {/* Left: logo + version dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em' }}>
          MORPHIUS
        </span>
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--status-ok)',
            display: 'inline-block',
          }}
          className="status-pulse"
        />
        <span style={{ color: 'var(--text-muted)' }}>
          {plugins.length} PLUGINS
        </span>
        {isProcessing && (
          <span style={{ color: 'var(--status-warn)', marginLeft: 8 }}>
            ● PROCESSING
          </span>
        )}
      </div>

      {/* Center: metrics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          CPU
          <MiniBar value={metrics.cpu} color="var(--status-ok)" />
          <span style={{ color: 'var(--text-secondary)', minWidth: 28 }}>
            {Math.round(metrics.cpu)}%
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          MEM
          <MiniBar value={metrics.mem} color="var(--status-warn)" />
          <span style={{ color: 'var(--text-secondary)', minWidth: 28 }}>
            {Math.round(metrics.mem)}%
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          NET
          <MiniBar value={metrics.net} color="var(--accent-dim)" />
          <span style={{ color: 'var(--text-secondary)', minWidth: 28 }}>
            {Math.round(metrics.net)}%
          </span>
        </span>
      </div>

      {/* Right: operator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>OPERATOR</span>
        <span style={{ color: 'var(--text-secondary)' }}>morphius-local</span>
        <span style={{ color: 'var(--border-accent)' }}>·</span>
        <span style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>
    </div>
  );
}
