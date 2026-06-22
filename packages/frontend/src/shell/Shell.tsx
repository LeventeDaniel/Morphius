import { useEffect, useState } from 'react';
import { Topbar } from './Topbar.js';
import { StatusBar } from './StatusBar.js';
import { CommandInput } from './CommandInput.js';
import { WorkspaceCanvas } from '../workspace/WorkspaceCanvas.js';
import { usePluginStore } from '../store/plugins.js';
import { useWorkspaceStore } from '../store/workspace.js';
import { useSessionStore } from '../store/session.js';
import { api } from '../api/client.js';

type NavItem = { id: string; label: string; icon: string };

const NAV_ITEMS: NavItem[] = [
  { id: 'workspace', label: 'WORKSPACE', icon: '⊞' },
  { id: 'chat', label: 'CHAT', icon: '◈' },
  { id: 'workflows', label: 'WORKFLOWS', icon: '⋮⋮' },
  { id: 'modules', label: 'MODULES', icon: '◻' },
  { id: 'registry', label: 'TOOL REGISTRY', icon: '⊛' },
  { id: 'memory', label: 'MEMORY', icon: '⧖' },
  { id: 'settings', label: 'SETTINGS', icon: '⚙' },
];

export function Shell() {
  const { setPlugins, setLoading } = usePluginStore();
  const { setRecipes, mode } = useWorkspaceStore();
  const { setAuditEvents } = useSessionStore();
  const [activeNav, setActiveNav] = useState('workspace');

  // Bootstrap: load plugins, recipes, audit events
  useEffect(() => {
    async function boot() {
      setLoading(true);
      try {
        const [pluginsRes, recipesRes, auditRes] = await Promise.allSettled([
          api.plugins.list(),
          api.workspace.recipes(),
          api.audit.list({ limit: 50 }),
        ]);

        if (pluginsRes.status === 'fulfilled') setPlugins(pluginsRes.value.plugins);
        if (recipesRes.status === 'fulfilled') setRecipes(recipesRes.value.recipes);
        if (auditRes.status === 'fulfilled') setAuditEvents(auditRes.value.events);
      } catch (err) {
        console.error('[Shell] Bootstrap error:', err);
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [setPlugins, setRecipes, setAuditEvents, setLoading]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Topbar */}
      <Topbar />

      {/* Main content area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar nav */}
        <nav
          style={{
            width: 64,
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 0',
            gap: 4,
            flexShrink: 0,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                title={item.label}
                onClick={() => setActiveNav(item.id)}
                style={{
                  width: 48,
                  height: 48,
                  background: isActive ? 'var(--bg-panel)' : 'transparent',
                  border: isActive
                    ? '1px solid var(--border-accent)'
                    : '1px solid transparent',
                  borderRadius: 6,
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  transition: 'all 0.15s',
                  padding: 4,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'var(--bg-panel-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                <span
                  style={{
                    fontSize: 7,
                    letterSpacing: '0.05em',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {item.label.length > 8 ? item.label.slice(0, 8) : item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Canvas + command input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Mode indicator strip */}
          <div
            style={{
              height: 28,
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: 12,
              fontSize: 10,
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            <span>WORKSPACE</span>
            <span style={{ color: 'var(--border-accent)' }}>›</span>
            <span style={{ color: 'var(--accent)' }}>{mode.toUpperCase()}</span>
          </div>

          {/* WorkspaceCanvas */}
          <WorkspaceCanvas />

          {/* Command input */}
          <CommandInput />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
