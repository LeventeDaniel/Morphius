import { useWorkspaceStore } from '../store/workspace.js';

export function ModeTransition({ children }: { children: React.ReactNode }) {
  const { isTransitioning, mode } = useWorkspaceStore();

  return (
    <div
      style={{
        flex: 1,
        overflow: 'hidden',
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? 'scale(0.99) translateY(4px)' : 'scale(1) translateY(0)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
      key={mode}
    >
      {children}
    </div>
  );
}
