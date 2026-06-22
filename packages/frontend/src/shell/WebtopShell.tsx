import { useEffect, useState, useCallback } from 'react';
import { CommandLauncher } from './CommandLauncher.js';
import { WebtopCanvas } from '../workspace/WebtopCanvas.js';
import { usePluginStore } from '../store/plugins.js';
import { api } from '../api/client.js';

export function WebtopShell() {
  const { setPlugins, setLoading } = usePluginStore();
  const [launcherOpen, setLauncherOpen] = useState(false);

  // Bootstrap: load plugin registry for mounting primitives
  useEffect(() => {
    async function boot() {
      setLoading(true);
      try {
        const pluginsRes = await api.plugins.list().catch(() => null);
        if (pluginsRes) setPlugins(pluginsRes.plugins);
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [setPlugins, setLoading]);

  // Global keybinds: / and Ctrl+K open the launcher
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (e.key === '/' && !inInput) {
      e.preventDefault();
      setLauncherOpen((v) => !v);
    }
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLauncherOpen((v) => !v);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a0a',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Full-screen canvas — the only persistent UI */}
      <WebtopCanvas onOpenLauncher={() => setLauncherOpen(true)} />

      {/* Command launcher — keyboard-only, floating overlay */}
      {launcherOpen && (
        <CommandLauncher onClose={() => setLauncherOpen(false)} />
      )}
    </div>
  );
}
