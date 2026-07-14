import { useRef, useCallback } from 'react';
import type { WindowState } from '../store/windows.js';

export interface FloatingWindowProps {
  window: WindowState;
  onClose: () => void;
  onCollapse: () => void;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  children: React.ReactNode;
}

export function FloatingWindow({
  window: win,
  onClose,
  onCollapse,
  onFocus,
  onMove,
  children,
}: FloatingWindowProps) {
  const dragState = useRef<{ startX: number; startY: number; winX: number; winY: number; moved: boolean } | null>(null);

  const handleTitleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      dragState.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y, moved: false };

      const onMouseMove = (mv: MouseEvent) => {
        if (!dragState.current) return;
        const dx = mv.clientX - dragState.current.startX;
        const dy = mv.clientY - dragState.current.startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.current.moved = true;
        onMove(dragState.current.winX + dx, dragState.current.winY + dy);
      };

      const onMouseUp = () => {
        dragState.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [win.x, win.y, onMove]
  );

  const isCollapsed = win.state === 'minimized' || win.state === 'collapsed';

  return (
    <div
      onMouseDown={onFocus}
      style={{
        position: 'absolute',
        left: win.x,
        top: win.y,
        width: win.width,
        zIndex: win.zIndex,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Title bar */}
      <div
        onMouseDown={handleTitleMouseDown}
        style={{
          height: 32,
          background: 'var(--bg-titlebar)',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          gap: 6,
          cursor: 'grab',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
          }}
        >
          {win.title}
        </span>

        {/* Collapse / Restore toggle — button only, title bar drag never triggers this */}
        <button
          onClick={(e) => { e.stopPropagation(); onCollapse(); }}
          title={isCollapsed ? 'Expand' : 'Collapse'}
          style={btnStyle}
        >
          {isCollapsed ? '▲' : '▼'}
        </button>

        {/* Close */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          title="Close"
          style={{ ...btnStyle, color: 'var(--text-secondary)' }}
        >
          ×
        </button>
      </div>

      {/* Content — hidden when minimised/collapsed */}
      {!isCollapsed && (
        <div
          style={{
            height: win.height,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--status-warn)',
  cursor: 'pointer',
  fontSize: 18,
  fontFamily: 'var(--font-mono)',
  width: 22,
  height: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  lineHeight: 1,
  flexShrink: 0,
};
