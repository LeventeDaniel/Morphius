import { create } from 'zustand';

// Neutral pipe — calls the AutoLayout module backend via the Host API.
// Core dispatches; it does not decide what to save or where. AutoLayout owns that.
async function dispatchAutoLayout(action: string, input: Record<string, unknown> = {}): Promise<unknown> {
  try {
    const res = await fetch('/api/host/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: 'morphius-auto-layout', action, input }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { ok: boolean; result?: unknown };
    return json.result ?? null;
  } catch { return null; }
}

function persistLayout(windows: WindowState[]): void {
  // Fire-and-forget — don't block UI interactions
  dispatchAutoLayout('saveLayout', { windows });
}

export async function loadSavedLayout(): Promise<WindowState[]> {
  const result = await dispatchAutoLayout('loadLayout') as { found: boolean; windows: WindowState[] } | null;
  return result?.windows ?? [];
}

export interface WindowState {
  id: string;
  title: string;
  type: 'module' | 'workflow' | 'terminal' | 'core';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  state: 'open' | 'minimized' | 'collapsed';
  source: 'core' | 'module' | 'workflow' | 'demo' | 'external';
  moduleId?: string;
  contentKind: string;
  data?: unknown;
}

type OpenWindowInput = Omit<WindowState, 'zIndex' | 'state' | 'x' | 'y'> & { x?: number; y?: number };

function centeredPosition(width: number, height: number): { x: number; y: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  return {
    x: Math.max(0, Math.round((vw - width) / 2)),
    y: Math.max(0, Math.round((vh - height) / 3)),
  };
}

interface WindowsStore {
  windows: WindowState[];
  maxZ: number;
  openWindow: (partial: OpenWindowInput) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, w: number, h: number) => void;
  minimizeWindow: (id: string) => void;
  collapseWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  resetCanvas: () => void;
}

export const useWindowStore = create<WindowsStore>((set, get) => ({
  windows: [],
  maxZ: 10,

  openWindow: (partial) => {
    const { windows, maxZ } = get();
    if (windows.find((w) => w.id === partial.id)) {
      get().bringToFront(partial.id);
      return;
    }
    const newZ = maxZ + 1;
    const pos = (partial.x === undefined || partial.y === undefined)
      ? centeredPosition(partial.width, partial.height)
      : { x: partial.x, y: partial.y };
    const win: WindowState = { ...partial, ...pos, zIndex: newZ, state: 'open' };
    const next = [...windows, win];
    set({ windows: next, maxZ: newZ });
    persistLayout(next);
  },

  focusWindow: (id) => {
    get().bringToFront(id);
  },

  moveWindow: (id, x, y) => {
    set((state) => {
      const windows = state.windows.map((w) => (w.id === id ? { ...w, x, y } : w));
      persistLayout(windows);
      return { windows };
    });
  },

  resizeWindow: (id, width, height) => {
    set((state) => {
      const windows = state.windows.map((w) => (w.id === id ? { ...w, width, height } : w));
      persistLayout(windows);
      return { windows };
    });
  },

  minimizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, state: 'minimized' } : w
      ),
    }));
  },

  collapseWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, state: w.state === 'collapsed' ? 'open' : 'collapsed' } : w
      ),
    }));
  },

  restoreWindow: (id) => {
    const newZ = get().maxZ + 1;
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, state: 'open', zIndex: newZ } : w
      ),
      maxZ: newZ,
    }));
  },

  closeWindow: (id) => {
    set((state) => {
      const windows = state.windows.filter((w) => w.id !== id);
      persistLayout(windows);
      return { windows };
    });
  },

  bringToFront: (id) => {
    const newZ = get().maxZ + 1;
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, zIndex: newZ, state: w.state === 'minimized' ? 'open' : w.state } : w
      ),
      maxZ: newZ,
    }));
  },

  resetCanvas: () => {
    set({ windows: [], maxZ: 10 });
  },
}));
