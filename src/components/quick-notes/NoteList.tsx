import { Search, Pin, Plus, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface QuickNote {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string | null;
  content: string;
  is_pinned: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

interface NoteListProps {
  notes: QuickNote[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  folderName: string;
  currentUserId: string | undefined;
}

function stripHtml(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function formatNoteDate(date: string): string {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ontem';
  const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return format(d, 'EEEE', { locale: ptBR });
  return format(d, 'dd/MM/yyyy');
}

export function NoteList({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  searchQuery,
  onSearchChange,
  folderName,
  currentUserId,
}: NoteListProps) {
  const pinned = notes.filter((n) => n.is_pinned);
  const others = notes.filter((n) => !n.is_pinned);

  const renderItem = (note: QuickNote) => {
    const preview = stripHtml(note.content).trim().slice(0, 80);
    const active = selectedNoteId === note.id;
    const notMine = note.user_id !== currentUserId;
    return (
      <button
        key={note.id}
        onClick={() => onSelectNote(note.id)}
        className={cn(
          'w-full border-l-2 px-4 py-3 text-left transition-colors',
          active
            ? 'border-primary bg-primary/5'
            : 'border-transparent hover:bg-muted/50'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-medium">
            {note.title?.trim() || 'Sem título'}
          </h3>
          {note.is_pinned && (
            <Pin className="h-3 w-3 shrink-0 fill-current text-amber-500" />
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{formatNoteDate(note.updated_at)}</span>
          {preview && <span className="line-clamp-1 truncate">{preview}</span>}
        </div>
        {(note.is_shared || notMine) && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{notMine ? 'Compartilhada com você' : 'Compartilhada'}</span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-full w-80 flex-col border-r border-border">
      <div className="border-b border-border px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="truncate text-sm font-semibold tracking-tight">{folderName}</h2>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onCreateNote}
            title="Nova nota"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar nota..."
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Nenhuma nota encontrada' : 'Nenhuma nota nesta pasta'}
            </p>
            {!searchQuery && (
              <Button
                variant="link"
                size="sm"
                onClick={onCreateNote}
                className="mt-2"
              >
                Criar primeira nota
              </Button>
            )}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div>
                <div className="bg-muted/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Fixadas
                </div>
                {pinned.map(renderItem)}
              </div>
            )}
            {others.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <div className="bg-muted/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Notas
                  </div>
                )}
                {others.map(renderItem)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
