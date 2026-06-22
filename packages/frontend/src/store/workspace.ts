import { create } from 'zustand';
import type { RecipeDTO } from '../api/client.js';

export type WorkspaceMode = 'chat' | 'research' | 'benchmark' | 'prompt-cleanup' | 'tool-debug';

interface WorkspaceState {
  mode: WorkspaceMode;
  activeRecipe: RecipeDTO | null;
  recipes: RecipeDTO[];
  isTransitioning: boolean;
  lastCommand: string;
  setMode: (mode: WorkspaceMode) => void;
  setActiveRecipe: (recipe: RecipeDTO | null) => void;
  setRecipes: (recipes: RecipeDTO[]) => void;
  startTransition: () => void;
  endTransition: () => void;
  setLastCommand: (cmd: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  mode: 'chat',
  activeRecipe: null,
  recipes: [],
  isTransitioning: false,
  lastCommand: '',

  setMode: (mode) => set({ mode }),
  setActiveRecipe: (recipe) => set({ activeRecipe: recipe }),
  setRecipes: (recipes) => set({ recipes }),
  startTransition: () => set({ isTransitioning: true }),
  endTransition: () => set({ isTransitioning: false }),
  setLastCommand: (lastCommand) => set({ lastCommand }),
}));
