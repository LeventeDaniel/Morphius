import { useWindowStore } from '../store/windows.js';
import { FloatingWindowRouter } from '../windows/FloatingWindowRouter.js';
import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../api/client.js';

interface WebtopCanvasProps {
  onOpenLauncher?: () => void;
}

export function WebtopCanvas({ onOpenLauncher }: WebtopCanvasProps) {
  const { windows, bringToFront, openWindow } = useWindowStore();

  // Draggable + button state
  const [btnPos, setBtnPos] = useState({ x: 32, y: 32 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    didDrag.current = false;
    dragOffset.current = { x: e.clientX - btnPos.x, y: e.clientY - btnPos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      didDrag.current = true;
      setBtnPos({
        x: Math.max(0, ev.clientX - dragOffset.current.x),
        y: Math.max(0, ev.clientY - dragOffset.current.y),
      });
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [btnPos]);

  // Keep a stable ref to openWindow so the message listener never needs to re-register
  const openWindowRef = useRef(openWindow);
  useEffect(() => { openWindowRef.current = openWindow; }, [openWindow]);

  // Relay postMessages from module iframes: callAction dispatch + openModule window
  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      const data = event.data as Record<string, unknown> | undefined;
      if (!data) return;

      // ── Open module window request ──
      if (data.__morphiusOpenModule) {
        const moduleId = data.moduleId as string | undefined;
        if (!moduleId) return;
        // Resolve human name from manifest, fall back to moduleId
        let title = moduleId;
        try {
          const res = await fetch(`/api/plugins/${moduleId}`);
          if (res.ok) {
            const manifest = await res.json() as { name?: string };
            if (manifest.name) title = manifest.name;
          }
        } catch { /* use moduleId */ }
        // Use stable id so openWindow deduplicates — brings existing window to front
        openWindowRef.current({
          id: `module-${moduleId}`,
          title,
          type: 'module',
          source: 'module',
          moduleId,
          contentKind: 'module-iframe',
          data: { moduleId },
          width: 480,
          height: 460,
        });
        return;
      }

      // ── callAction relay ──
      if (!data.__morphiusCallAction) return;
      const { moduleId, action, input, requestId } = data as {
        moduleId: string; action: string; input: Record<string, unknown>; requestId: string;
      };

      try {
        const result = await api.host.dispatch(moduleId, action, input ?? {});
        (event.source as WindowProxy)?.postMessage(
          { __morphiusResponse: true, requestId, result: result.result },
          '*'
        );
      } catch (err) {
        (event.source as WindowProxy)?.postMessage(
          { __morphiusResponse: true, requestId, error: (err as Error).message },
          '*'
        );
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const onBtnClick = useCallback(() => {
    if (didDrag.current) return; // was a drag, not a click
    openWindow({
      id: 'module-loader',
      title: 'LOAD MODULE',
      type: 'core',
      source: 'core',
      contentKind: 'module-loader',
      width: 440,
      height: 260,
    });
  }, [openWindow]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--bg-webtop)',
        overflow: 'hidden',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // bare canvas click — no-op
        }
      }}
    >
      {windows.map((win) => (
        <FloatingWindowRouter
          key={win.id}
          window={win}
          onBringToFront={() => bringToFront(win.id)}
        />
      ))}

      {/* Empty-state — logo + wordmark + hint */}
      {windows.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            pointerEvents: 'none',
          }}
        >
          <img
            src="/logo.png"
            alt="Morphius"
            style={{ width: 240, height: 240, opacity: 0.85, userSelect: 'none', pointerEvents: 'none' }}
            draggable={false}
          />
          <div
            style={{
              fontSize: 21,
              color: 'var(--status-warn)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              userSelect: 'none',
            }}
          >
            MORPHIUS
          </div>
          <div
            style={{
              fontSize: 18,
              color: 'var(--text-ghost)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              userSelect: 'none',
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
            onClick={onOpenLauncher}
            title="Open command launcher"
          >
            press / to start
          </div>
        </div>
      )}

      {/* Floating + button — always visible, draggable */}
      <div
        onMouseDown={onMouseDown}
        onClick={onBtnClick}
        title="Load module"
        style={{
          position: 'absolute',
          left: btnPos.x,
          top: btnPos.y,
          width: 36,
          height: 36,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--status-warn)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          zIndex: 8000,
          fontSize: 28,
          fontFamily: 'var(--font-mono)',
          userSelect: 'none',
          transition: 'color 0.1s, border-color 0.1s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.color = 'var(--text-primary)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--text-muted)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.color = 'var(--status-warn)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        }}
      >
        +
      </div>
    </div>
  );
}
