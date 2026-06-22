import { useState } from 'react';
import { PluginBlock } from '../plugins/PluginBlock.js';
import type { RecipeDTO } from '../api/client.js';

interface PanelSlotProps {
  panel: RecipeDTO['defaultPanels'][0];
  onClose?: (id: string) => void;
}

export function PanelSlot({ panel, onClose }: PanelSlotProps) {
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="panel-appear"
      style={{
        gridColumn: `${panel.position.col} / span ${panel.position.colSpan}`,
        gridRow: `${panel.position.row} / span ${panel.position.rowSpan}`,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: minimized ? 36 : undefined,
        ...(expanded
          ? {
              position: 'absolute',
              inset: 8,
              zIndex: 100,
              gridColumn: undefined,
              gridRow: undefined,
            }
          : {}),
      }}
    >
      {/* Panel title bar */}
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
          cursor: 'default',
        }}
      >
        {/* Drag handle */}
        <span
          style={{
            color: 'var(--text-muted)',
            cursor: 'grab',
            fontSize: 13,
            userSelect: 'none',
          }}
        >
          ⠿
        </span>

        {/* Plugin id + block */}
        <span
          style={{
            flex: 1,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {panel.pluginId.toUpperCase()}{' '}
          <span style={{ color: 'var(--text-muted)' }}>/ {panel.blockId}</span>
        </span>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 4 }}>
          <PanelButton title="Minimize" onClick={() => setMinimized((v) => !v)}>
            {minimized ? '▲' : '▼'}
          </PanelButton>
          <PanelButton title={expanded ? 'Restore' : 'Expand'} onClick={() => setExpanded((v) => !v)}>
            {expanded ? '⤡' : '⤢'}
          </PanelButton>
          {onClose && (
            <PanelButton title="Close" onClick={() => onClose(panel.id)}>
              ✕
            </PanelButton>
          )}
        </div>
      </div>

      {/* Panel body */}
      {!minimized && (
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <PluginBlock pluginId={panel.pluginId} blockId={panel.blockId} />
        </div>
      )}
    </div>
  );
}

function PanelButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: 'none',
        border: '1px solid transparent',
        borderRadius: 3,
        color: 'var(--text-muted)',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        padding: '2px 5px',
        transition: 'color 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--text-primary)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-muted)';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
