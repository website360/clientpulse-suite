import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { ShortcutsHelp } from './ShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      callback: () => setCommandOpen(true),
    },
    {
      key: '?',
      ctrl: true,
      callback: () => setHelpOpen(true),
    },
    {
      key: 'd',
      ctrl: true,
      callback: () => navigate('/'),
    },
    {
      key: 't',
      ctrl: true,
      callback: () => navigate('/tickets'),
    },
    {
      key: 'l',
      ctrl: true,
      callback: () => navigate('/clients'),
    },
  ]);

  return (
    <>
      {children}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
