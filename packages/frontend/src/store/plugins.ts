import { create } from 'zustand';
import type { PluginManifestDTO } from '../api/client.js';

export type PluginStatus = 'idle' | 'loading' | 'running' | 'error';

interface PluginState {
  plugins: PluginManifestDTO[];
  statuses: Record<string, PluginStatus>;
  errors: Record<string, string>;
  isLoading: boolean;
  setPlugins: (plugins: PluginManifestDTO[]) => void;
  setStatus: (id: string, status: PluginStatus) => void;
  setError: (id: string, error: string) => void;
  clearError: (id: string) => void;
  setLoading: (loading: boolean) => void;
  getPlugin: (id: string) => PluginManifestDTO | undefined;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  statuses: {},
  errors: {},
  isLoading: false,

  setPlugins: (plugins) => set({ plugins }),
  setStatus: (id, status) =>
    set((state) => ({ statuses: { ...state.statuses, [id]: status } })),
  setError: (id, error) =>
    set((state) => ({ errors: { ...state.errors, [id]: error } })),
  clearError: (id) =>
    set((state) => {
      const errors = { ...state.errors };
      delete errors[id];
      return { errors };
    }),
  setLoading: (isLoading) => set({ isLoading }),
  getPlugin: (id) => get().plugins.find((p) => p.id === id),
}));
