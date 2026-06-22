export type PanelLayout = 'single' | 'split' | 'grid' | 'focus';

export interface PanelConfig {
  id: string;
  pluginId: string;
  blockId: string;
  position: {
    col: number;
    row: number;
    colSpan: number;
    rowSpan: number;
  };
}

export interface WorkspaceRecipe {
  id: string;
  name: string;
  description: string;
  requiredPlugins: string[];  // plugin ids
  layout: PanelLayout;
  defaultPanels: PanelConfig[];
}
