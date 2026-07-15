import { FloatingWindow } from './FloatingWindow.js';
import { useWindowStore } from '../store/windows.js';
import type { WindowState } from '../store/windows.js';

interface Props {
  window: WindowState;
}

// Renders a module's iframe directly using the already-built bundle.
// No pipeline — assumes the module is already mounted and built.
export function ModuleIframeWindow({ window: win }: Props) {
  const { closeWindow, collapseWindow, bringToFront, moveWindow } = useWindowStore();
  const moduleId = (win.data as { moduleId?: string } | undefined)?.moduleId ?? win.moduleId ?? '';
  const iframeUrl = `/api/runtime/iframe/${moduleId}?t=${win.id.split('-').pop()}`;

  return (
    <FloatingWindow
      window={win}
      onClose={() => closeWindow(win.id)}
      onCollapse={() => collapseWindow(win.id)}
      onFocus={() => bringToFront(win.id)}
      onMove={(x, y) => moveWindow(win.id, x, y)}
    >
      <iframe
        src={iframeUrl}
        style={{ flex: 1, width: '100%', height: '100%', border: 'none', background: '#111', display: 'block' }}
        title={moduleId}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </FloatingWindow>
  );
}
