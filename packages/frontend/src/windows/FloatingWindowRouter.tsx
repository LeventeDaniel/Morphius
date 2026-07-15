import type { WindowState } from '../store/windows.js';
import { ModuleMountWindow } from './ModuleMountWindow.js';
import { ModuleIframeWindow } from './ModuleIframeWindow.js';
import { WorkflowMountWindow } from './WorkflowMountWindow.js';
import { TerminalWindow } from './TerminalWindow.js';
import { ModuleListWindow } from './ModuleListWindow.js';
import { WorkflowListWindow } from './WorkflowListWindow.js';
import { ProvidersListWindow } from './ProvidersListWindow.js';
import { ModuleLoaderWindow } from './ModuleLoaderWindow.js';

interface Props {
  window: WindowState;
  onBringToFront: () => void;
}

export function FloatingWindowRouter({ window: win }: Props) {
  switch (win.contentKind) {
    case 'plugin-manifest':
      return <ModuleMountWindow window={win} />;
    case 'module-iframe':
      return <ModuleIframeWindow window={win} />;
    case 'recipe':
      return <WorkflowMountWindow window={win} />;
    case 'terminal':
      return <TerminalWindow window={win} />;
    case 'module-list':
      return <ModuleListWindow window={win} />;
    case 'workflow-list':
      return <WorkflowListWindow window={win} />;
    case 'providers-list':
      return <ProvidersListWindow window={win} />;
    case 'module-loader':
      return <ModuleLoaderWindow window={win} />;
    default:
      return null;
  }
}
