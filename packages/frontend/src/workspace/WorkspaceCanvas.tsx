import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspace.js';
import { PanelSlot } from './PanelSlot.js';
import { ModeTransition } from './ModeTransition.js';
import { ActivePlugins } from '../panels/ActivePlugins.js';
import { OutputPanel } from '../panels/OutputPanel.js';
import { AuditLog } from '../panels/AuditLog.js';
import { ApprovalPanel } from '../panels/ApprovalPanel.js';
import { MemorySnapshot } from '../panels/MemorySnapshot.js';
import type { RecipeDTO } from '../api/client.js';

type PanelId = string;

// Default idle panels shown when no recipe is active
const IDLE_PANELS = [
  { id: 'active-plugins', type: 'active-plugins' },
  { id: 'output', type: 'output' },
  { id: 'audit', type: 'audit' },
];

function BuiltinPanel({ type }: { type: string }) {
  switch (type) {
    case 'active-plugins': return <ActivePlugins />;
    case 'output': return <OutputPanel />;
    case 'audit': return <AuditLog />;
    case 'approvals': return <ApprovalPanel />;
    case 'memory': return <MemorySnapshot />;
    default: return (
      <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: 8 }}>
        Unknown panel: {type}
      </div>
    );
  }
}

function IdlePanelSlot({
  panel,
  style,
}: {
  panel: { id: string; type: string };
  style?: React.CSSProperties;
}) {
  const [minimized, setMinimized] = useState(false);
  return (
    <div
      className="panel-appear"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          height: 36,
          background: 'var(--bg-secondary)',
          borderBottom: minimized ? 'none' : '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: 13, userSelect: 'none' }}>⠿</span>
        <span
          style={{
            flex: 1,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
          }}
        >
          {panel.type.toUpperCase()}
        </span>
        <button
          onClick={() => setMinimized((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {minimized ? '▲' : '▼'}
        </button>
      </div>
      {!minimized && (
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <BuiltinPanel type={panel.type} />
        </div>
      )}
    </div>
  );
}

export function WorkspaceCanvas() {
  const { activeRecipe, mode, isTransitioning } = useWorkspaceStore();
  const [closedPanels, setClosedPanels] = useState<Set<PanelId>>(new Set());

  // Reset closed panels when recipe changes
  useEffect(() => {
    setClosedPanels(new Set());
  }, [activeRecipe?.id, mode]);

  const handleClose = (id: string) => {
    setClosedPanels((prev) => new Set([...prev, id]));
  };

  const visiblePanels = activeRecipe?.defaultPanels.filter((p) => !closedPanels.has(p.id)) ?? [];

  return (
    <ModeTransition>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 12,
          height: '100%',
        }}
      >
        {activeRecipe ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gridAutoRows: '60px',
              gap: 8,
              minHeight: '100%',
              position: 'relative',
            }}
          >
            {visiblePanels.map((panel) => (
              <PanelSlot key={panel.id} panel={panel as RecipeDTO['defaultPanels'][0]} onClose={handleClose} />
            ))}
            {visiblePanels.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / span 12',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                }}
              >
                ALL PANELS CLOSED — TYPE A COMMAND TO RELOAD
              </div>
            )}
          </div>
        ) : (
          // Idle state: show built-in panels
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridAutoRows: 'minmax(200px, 1fr)',
              gap: 8,
              height: '100%',
            }}
          >
            {IDLE_PANELS.map((panel) => (
              <IdlePanelSlot key={panel.id} panel={panel} />
            ))}
          </div>
        )}

        {/* Transition overlay */}
        {isTransitioning && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--bg-primary)',
              opacity: 0.4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              pointerEvents: 'none',
            }}
          >
            LOADING WORKSPACE...
          </div>
        )}
      </div>
    </ModeTransition>
  );
}
