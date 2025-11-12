import { useEffect, useCallback } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const activeElement = document.activeElement;
      const isInput =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      shortcuts.forEach((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatch = shortcut.meta ? event.metaKey : true;

        // Don't trigger shortcuts when typing in inputs (except for ctrl/cmd+k)
        if (isInput && !(shortcut.ctrl && shortcut.key === 'k')) {
          return;
        }

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          event.preventDefault();
          shortcut.callback();
        }
      });
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const KEYBOARD_SHORTCUTS = {
  SEARCH: { key: 'k', ctrl: true, description: 'Abrir busca global' },
  SHORTCUTS_HELP: { key: '?', ctrl: true, description: 'Ver atalhos' },
  NEW_TICKET: { key: 'n', ctrl: true, shift: true, description: 'Novo ticket' },
  NEW_CLIENT: { key: 'c', ctrl: true, shift: true, description: 'Novo cliente' },
  NEW_PROJECT: { key: 'p', ctrl: true, shift: true, description: 'Novo projeto' },
  DASHBOARD: { key: 'd', ctrl: true, description: 'Ir para Dashboard' },
  TICKETS: { key: 't', ctrl: true, description: 'Ir para Tickets' },
  CLIENTS: { key: 'l', ctrl: true, description: 'Ir para Clientes' },
};
