import { useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Pin, PinOff, Users, UserRound, Trash2, Check, Loader2, MoreVertical, FolderInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { QuickNote } from './NoteList';
import type { QuickNoteFolder } from './FolderSidebar';
import { toastError } from '@/hooks/use-toast';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface NoteEditorProps {
  note: QuickNote;
  folders: QuickNoteFolder[];
  currentUserId: string | undefined;
  onChange: (patch: Partial<QuickNote>) => void;
  onSave: (patch: Partial<QuickNote>) => Promise<void>;
  onDelete: () => void;
}

const quillModulesBase = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
};

export function NoteEditor({
  note,
  folders,
  currentUserId,
  onChange,
  onSave,
  onDelete,
}: NoteEditorProps) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [localTitle, setLocalTitle] = useState(note.title ?? '');
  const [localContent, setLocalContent] = useState(note.content ?? '');
  const quillRef = useRef<ReactQuill>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingPatch = useRef<Partial<QuickNote>>({});

  const isOwner = note.user_id === currentUserId;
  const canEdit = isOwner || note.is_shared;

  // Reset local state when switching notes
  useEffect(() => {
    setLocalTitle(note.title ?? '');
    setLocalContent(note.content ?? '');
    setStatus('idle');
    pendingPatch.current = {};
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, [note.id]);

  const scheduleSave = (patch: Partial<QuickNote>) => {
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const toSend = pendingPatch.current;
      pendingPatch.current = {};
      try {
        await onSave(toSend);
        setStatus('saved');
      } catch (e: any) {
        setStatus('error');
        toastError('Erro ao salvar', e?.message || 'Tente novamente');
      }
    }, 700);
  };

  // Flush pending save when note changes / unmounts
  useEffect(() => {
    return () => {
      if (saveTimer.current && Object.keys(pendingPatch.current).length > 0) {
        clearTimeout(saveTimer.current);
        onSave(pendingPatch.current).catch(() => {});
      }
    };
  }, [note.id, onSave]);

  const handleTitleChange = (v: string) => {
    setLocalTitle(v);
    onChange({ title: v });
    scheduleSave({ title: v });
  };

  const handleContentChange = (v: string) => {
    setLocalContent(v);
    onChange({ content: v });
    scheduleSave({ content: v });
  };

  const handleTogglePin = async () => {
    const next = !note.is_pinned;
    onChange({ is_pinned: next });
    setStatus('saving');
    try {
      await onSave({ is_pinned: next });
      setStatus('saved');
    } catch (e: any) {
      setStatus('error');
      toastError('Erro ao fixar', e?.message);
    }
  };

  const handleToggleShared = async () => {
    if (!isOwner) return;
    const next = !note.is_shared;
    onChange({ is_shared: next });
    setStatus('saving');
    try {
      await onSave({ is_shared: next });
      setStatus('saved');
    } catch (e: any) {
      setStatus('error');
      toastError('Erro ao alterar compartilhamento', e?.message);
    }
  };

  const handleMoveFolder = async (folderId: string | null) => {
    onChange({ folder_id: folderId });
    setStatus('saving');
    try {
      await onSave({ folder_id: folderId });
      setStatus('saved');
    } catch (e: any) {
      setStatus('error');
      toastError('Erro ao mover', e?.message);
    }
  };

  // Image upload handler for Quill toolbar
  const imageHandler = useMemo(() => {
    return () => {
      if (!currentUserId) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
          toastError('Imagem muito grande', 'Limite de 10MB');
          return;
        }
        const ext = file.name.split('.').pop();
        const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('quick-note-images')
          .upload(path, file);
        if (upErr) {
          toastError('Erro no upload', upErr.message);
          return;
        }
        const { data } = supabase.storage.from('quick-note-images').getPublicUrl(path);
        const editor = quillRef.current?.getEditor();
        if (!editor) return;
        const range = editor.getSelection(true);
        editor.insertEmbed(range.index, 'image', data.publicUrl, 'user');
        editor.setSelection({ index: range.index + 1, length: 0 });
      };
      input.click();
    };
  }, [currentUserId]);

  const quillModules = useMemo(
    () => ({
      ...quillModulesBase,
      toolbar: {
        container: quillModulesBase.toolbar,
        handlers: { image: imageHandler },
      },
    }),
    [imageHandler]
  );

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-6 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {format(new Date(note.updated_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {status === 'saving' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
              </>
            )}
            {status === 'saved' && (
              <>
                <Check className="h-3 w-3 text-emerald-600" /> Salvo
              </>
            )}
            {status === 'error' && (
              <span className="text-destructive">Erro ao salvar</span>
            )}
            {!isOwner && (
              <span className="ml-2">· Compartilhada com você</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleTogglePin}
            title={note.is_pinned ? 'Desafixar' : 'Fixar'}
            disabled={!canEdit}
          >
            {note.is_pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </Button>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleShared}
              title={note.is_shared ? 'Tornar privada' : 'Compartilhar com a equipe'}
            >
              {note.is_shared ? (
                <Users className="h-4 w-4 text-blue-600" />
              ) : (
                <UserRound className="h-4 w-4" />
              )}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <FolderInput className="h-3.5 w-3.5" />
                Mover para
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={note.folder_id ?? '__none__'}
                onValueChange={(v) =>
                  handleMoveFolder(v === '__none__' ? null : v)
                }
              >
                <DropdownMenuRadioItem value="__none__">
                  Sem pasta
                </DropdownMenuRadioItem>
                {folders.map((f) => (
                  <DropdownMenuRadioItem key={f.id} value={f.id}>
                    {f.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir nota
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-6 pt-4">
        <Input
          value={localTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Título"
          disabled={!canEdit}
          className="h-auto border-0 px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="quick-notes-editor flex-1 overflow-hidden px-6 pb-6 pt-2">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={localContent}
          onChange={handleContentChange}
          readOnly={!canEdit}
          modules={quillModules}
          placeholder="Comece a escrever..."
        />
      </div>
    </div>
  );
}
