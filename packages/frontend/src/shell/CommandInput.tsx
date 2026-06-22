import { useState, useRef, useCallback } from 'react';
import { api } from '../api/client.js';
import { useWorkspaceStore } from '../store/workspace.js';
import { useSessionStore } from '../store/session.js';

const QUICK_COMMANDS = ['/workflow', '/module', '/search', '/memory', '/help'];

interface CommandInputProps {
  onCommand?: (input: string) => void;
}

export function CommandInput({ onCommand }: CommandInputProps) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setMode, setActiveRecipe, setLastCommand, startTransition, endTransition } = useWorkspaceStore();
  const { setCurrentTask, setProcessing } = useSessionStore();

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setProcessing(true);
    setCurrentTask(trimmed);
    setLastCommand(trimmed);
    setValue('');

    try {
      // Classify intent and load the appropriate recipe
      const result = await api.workspace.classify(trimmed);
      const recipeId = result.recipeId;

      startTransition();
      setMode(recipeId as Parameters<typeof setMode>[0]);

      try {
        const recipe = await api.workspace.recipe(recipeId);
        setActiveRecipe(recipe);
      } catch {
        // Recipe might not exist on backend yet; use null
        setActiveRecipe(null);
      }

      setTimeout(() => endTransition(), 300);
      onCommand?.(trimmed);
    } catch (err) {
      console.error('[CommandInput] classify failed:', err);
    } finally {
      setIsSubmitting(false);
      setProcessing(false);
    }
  }, [value, isSubmitting, setMode, setActiveRecipe, setLastCommand, setCurrentTask, setProcessing, startTransition, endTransition, onCommand]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickCommand = (cmd: string) => {
    setValue(cmd + ' ');
    inputRef.current?.focus();
  };

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        padding: '10px 16px',
        flexShrink: 0,
      }}
    >
      {/* Quick command chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => handleQuickCommand(cmd)}
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '2px 8px',
              letterSpacing: '0.06em',
              transition: 'color 0.12s, border-color 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--border-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Prompt glyph */}
        <span
          style={{
            color: 'var(--status-ok)',
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            userSelect: 'none',
          }}
        >
          ›
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything or type a command..."
          disabled={isSubmitting}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            caretColor: 'var(--status-ok)',
          }}
        />

        {/* Right info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <span>
            MODEL: <span style={{ color: 'var(--text-secondary)' }}>MORPHIUS-CORE</span>
          </span>
          <span>
            CONTEXT: <span style={{ color: 'var(--text-secondary)' }}>128K</span>
          </span>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !value.trim()}
            title="Submit"
            style={{
              background: value.trim() ? 'var(--accent)' : 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: value.trim() ? 'var(--bg-primary)' : 'var(--text-muted)',
              cursor: value.trim() ? 'pointer' : 'default',
              padding: '4px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            {isSubmitting ? '...' : '↵'}
          </button>
        </div>
      </div>
    </div>
  );
}
