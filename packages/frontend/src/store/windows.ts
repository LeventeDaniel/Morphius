import { create } from 'zustand';

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

type OpenWindowInput = Omit<WindowState, 'zIndex' | 'state'> & { x?: number; y?: number };

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
    set({ windows: [...windows, win], maxZ: newZ });
  },

  focusWindow: (id) => {
    get().bringToFront(id);
  },

  moveWindow: (id, x, y) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    }));
  },

  resizeWindow: (id, width, height) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    }));
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
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
    }));
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
