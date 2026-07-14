import { useState, useRef, useEffect } from 'react';
import { FloatingWindow } from './FloatingWindow.js';
import { useWindowStore } from '../store/windows.js';
import { usePluginStore } from '../store/plugins.js';
import { api } from '../api/client.js';
import type { WindowState } from '../store/windows.js';

const VERSION = '0.1.0';

const HELP_TEXT = [
  '  help        — show this list',
  '  status      — system status',
  '  modules     — list loaded plugins',
  '  clear       — clear terminal',
  '  version     — Morphius version',
];

interface Line {
  id: number;
  kind: 'prompt' | 'output';
  text: string;
}

let lineId = 0;

interface TerminalWindowProps {
  window: WindowState;
}

export function TerminalWindow({ window: win }: TerminalWindowProps) {
  const { closeWindow, collapseWindow, bringToFront, moveWindow } = useWindowStore();
  const { plugins } = usePluginStore();
  const [lines, setLines] = useState<Line[]>([
    { id: lineId++, kind: 'output', text: `MORPHIUS TERMINAL v${VERSION}` },
    { id: lineId++, kind: 'output', text: 'type "help" for available commands' },
    { id: lineId++, kind: 'output', text: '' },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const appendLines = (prompt: Line, results: string[]) => {
    if (results[0] === '__CLEAR__') {
      setLines([]);
      return;
    }
    const outputLines: Line[] = results.map((t) => ({ id: lineId++, kind: 'output' as const, text: t }));
    setLines((prev) => [...prev, prompt, ...outputLines, { id: lineId++, kind: 'output', text: '' }]);
  };

  const submit = async () => {
    const cmd = input.trim();
    if (!cmd) return;
    setInput('');
    const promptLine: Line = { id: lineId++, kind: 'prompt', text: `> ${cmd}` };
    const c = cmd.trim().toLowerCase();

    if (c === 'status') {
      let backendStatus = 'down';
      let pluginCount = plugins.length;
      try {
        const h = await api.health();
        backendStatus = 'running';
        pluginCount = h.plugins ?? plugins.length;
      } catch {
        // backend unreachable
      }
      appendLines(promptLine, [
        'SYSTEM STATUS',
        '  webtop   : running',
        `  backend  : ${backendStatus}`,
        `  plugins  : ${pluginCount} loaded`,
        '  mode     : live',
      ]);
      return;
    }

    if (c === 'modules') {
      if (plugins.length === 0) {
        appendLines(promptLine, ['NO MODULES LOADED']);
      } else {
        appendLines(promptLine, ['LOADED MODULES:', ...plugins.map((p) => `  · ${p.id}`)]);
      }
      return;
    }

    if (c === 'help') {
      appendLines(promptLine, ['AVAILABLE COMMANDS:', ...HELP_TEXT]);
      return;
    }
    if (c === 'clear') {
      setLines([]);
      return;
    }
    if (c === 'version') {
      appendLines(promptLine, [`MORPHIUS v${VERSION}`]);
      return;
    }
    appendLines(promptLine, [`command not found: ${cmd}`, 'type "help" for available commands']);
  };

  return (
    <FloatingWindow
      window={win}
      onClose={() => closeWindow(win.id)}
      onCollapse={() => collapseWindow(win.id)}
      onFocus={() => bringToFront(win.id)}
      onMove={(x, y) => moveWindow(win.id, x, y)}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#050505',
          padding: '10px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: 15,
          height: '100%',
        }}
      >
        {/* Output area */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {lines.map((line) => (
            <div
              key={line.id}
              style={{
                color: line.kind === 'prompt' ? '#e8e8e8' : '#888',
                whiteSpace: 'pre',
                lineHeight: 1.6,
              }}
            >
              {line.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 6, borderTop: '1px solid #1a1a1a' }}>
          <span style={{ color: '#4ade80' }}>›</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            autoFocus
            spellCheck={false}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e8e8e8',
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              caretColor: '#4ade80',
            }}
          />
          <span className="cursor-blink" style={{ color: '#4ade80', fontSize: 18 }}>▋</span>
        </div>
      </div>
    </FloatingWindow>
  );
}
