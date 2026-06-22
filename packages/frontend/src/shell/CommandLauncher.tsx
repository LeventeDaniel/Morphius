import { useState, useEffect, useRef } from 'react';
import { useWindowStore } from '../store/windows.js';

interface CommandLauncherProps {
  onClose: () => void;
}

const HELP_LINES = [
  'load module           — load a module from a folder path',
  'open terminal         — terminal window',
  'reset canvas          — close all windows',
  'help                  — show this list',
];

export function CommandLauncher({ onClose }: CommandLauncherProps) {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { openWindow, resetCanvas } = useWindowStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const openTerminal = () => {
    openWindow({
      id: `terminal-${Date.now()}`,
      title: 'TERMINAL',
      type: 'terminal',
      source: 'core',
      contentKind: 'terminal',
      width: 460,
      height: 300,
    });
    onClose();
  };

  const openModuleLoader = () => {
    openWindow({
      id: 'module-loader',
      title: 'LOAD MODULE',
      type: 'core',
      source: 'core',
      contentKind: 'module-loader',
      width: 440,
      height: 260,
    });
    onClose();
  };

  const execute = async () => {
    const cmd = input.trim().toLowerCase();
    if (!cmd) { onClose(); return; }

    if (cmd === 'load module' || cmd === 'mount module' || cmd === 'open manifest') { openModuleLoader(); return; }
    if (cmd === 'open terminal') { openTerminal(); return; }
    if (cmd === 'reset canvas') { resetCanvas(); onClose(); return; }
    if (cmd === 'help') { setShowHelp(true); setInput(''); return; }

    setFeedback(`unknown command: "${cmd}" — type "help" for list`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 520,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 48, gap: 8 }}>
          <span style={{ color: 'var(--status-ok)', fontSize: 18, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>›</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setFeedback(''); setShowHelp(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') execute(); if (e.key === 'Escape') onClose(); }}
            placeholder="type a command..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 17,
              caretColor: 'var(--status-ok)',
            }}
          />
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{ padding: '4px 12px 8px', fontSize: 14, color: 'var(--status-error)', fontFamily: 'var(--font-mono)' }}>
            {feedback}
          </div>
        )}

        {/* Help overlay */}
        {showHelp && (
          <div style={{ borderTop: '1px solid var(--bg-titlebar)', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {HELP_LINES.map((line) => (
              <div key={line} style={{ fontSize: 14, color: 'var(--status-warn)', fontFamily: 'var(--font-mono)' }}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
