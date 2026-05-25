import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase as supabaseTyped } from '@/integrations/supabase/client';
// Quick notes tables (quick_notes / quick_note_folders) are not yet in the generated
// Supabase types. Cast locally so we can use them without polluting the global client.
const supabase = supabaseTyped as any;
import { useAuth } from '@/contexts/AuthContext';
import { toastError, toastSuccess } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FolderSidebar, type QuickNoteFolder } from '@/components/quick-notes/FolderSidebar';
import { NoteList, type QuickNote } from '@/components/quick-notes/NoteList';
import { NoteEditor } from '@/components/quick-notes/NoteEditor';
import { FolderFormDialog } from '@/components/quick-notes/FolderFormDialog';
import { NotebookPen } from 'lucide-react';

export default function QuickNotes() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<QuickNoteFolder[]>([]);
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<QuickNoteFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<QuickNoteFolder | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<QuickNote | null>(null);

  useEffect(() => {
    if (user) {
      fetchAll();
    }
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const [foldersRes, notesRes] = await Promise.all([
      supabase
        .from('quick_note_folders')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('quick_notes')
        .select('*')
        .order('updated_at', { ascending: false }),
    ]);
    if (foldersRes.error) toastError('Erro ao carregar pastas', foldersRes.error.message);
    if (notesRes.error) toastError('Erro ao carregar notas', notesRes.error.message);
    setFolders((foldersRes.data as QuickNoteFolder[]) ?? []);
    setNotes((notesRes.data as QuickNote[]) ?? []);
    setLoading(false);
  };

  const visibleNotes = useMemo(() => {
    let list = notes;
    if (selectedFolderId !== null) {
      list = list.filter((n) => n.folder_id === selectedFolderId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q)
      );
    }
    return list.slice().sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, selectedFolderId, searchQuery]);

  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => {
      if (n.folder_id) counts[n.folder_id] = (counts[n.folder_id] ?? 0) + 1;
    });
    return counts;
  }, [notes]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  // Auto-select first note when filter/folder changes if current selection isn't visible
  useEffect(() => {
    if (visibleNotes.length === 0) {
      setSelectedNoteId(null);
      return;
    }
    if (!visibleNotes.find((n) => n.id === selectedNoteId)) {
      setSelectedNoteId(visibleNotes[0].id);
    }
  }, [visibleNotes, selectedNoteId]);

  const currentFolderName = selectedFolderId === null
    ? 'Todas as notas'
    : folders.find((f) => f.id === selectedFolderId)?.name ?? 'Pasta';

  // === Folder actions ===
  const handleCreateFolderOpen = () => {
    setEditingFolder(null);
    setFolderDialogOpen(true);
  };
  const handleEditFolder = (folder: QuickNoteFolder) => {
    setEditingFolder(folder);
    setFolderDialogOpen(true);
  };
  const handleSubmitFolder = async (data: { name: string; color: string; is_shared: boolean }) => {
    if (!user) return;
    if (editingFolder) {
      const { error } = await supabase
        .from('quick_note_folders')
        .update(data)
        .eq('id', editingFolder.id);
      if (error) {
        toastError('Erro ao atualizar pasta', error.message);
        throw error;
      }
      toastSuccess('Pasta atualizada');
    } else {
      const position = folders.length;
      const { error } = await supabase
        .from('quick_note_folders')
        .insert({ ...data, user_id: user.id, position });
      if (error) {
        toastError('Erro ao criar pasta', error.message);
        throw error;
      }
      toastSuccess('Pasta criada');
    }
    await fetchAll();
  };
  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    const { error } = await supabase
      .from('quick_note_folders')
      .delete()
      .eq('id', folderToDelete.id);
    if (error) {
      toastError('Erro ao excluir pasta', error.message);
    } else {
      toastSuccess('Pasta excluída', 'As notas dela continuam disponíveis em "Todas as notas"');
      if (selectedFolderId === folderToDelete.id) setSelectedFolderId(null);
      await fetchAll();
    }
    setFolderToDelete(null);
  };

  // === Note actions ===
  const handleCreateNote = async () => {
    if (!user) return;
    const targetFolder = selectedFolderId;
    // If selected folder is shared and owned by someone else, new note inherits is_shared
    const folder = folders.find((f) => f.id === targetFolder);
    const inheritShared = folder?.is_shared ?? false;
    const { data, error } = await supabase
      .from('quick_notes')
      .insert({
        user_id: user.id,
        folder_id: targetFolder,
        title: '',
        content: '',
        is_shared: inheritShared,
      })
      .select()
      .single();
    if (error || !data) {
      toastError('Erro ao criar nota', error?.message);
      return;
    }
    setNotes((prev) => [data as QuickNote, ...prev]);
    setSelectedNoteId(data.id);
  };

  const handlePatchNote = useCallback(
    async (patch: Partial<QuickNote>) => {
      if (!selectedNote) return;
      const { error } = await supabase
        .from('quick_notes')
        .update(patch)
        .eq('id', selectedNote.id);
      if (error) throw error;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedNote.id
            ? { ...n, ...patch, updated_at: new Date().toISOString() }
            : n
        )
      );
    },
    [selectedNote]
  );

  const handleOptimisticChange = (patch: Partial<QuickNote>) => {
    if (!selectedNote) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === selectedNote.id ? { ...n, ...patch } : n))
    );
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    const { error } = await supabase
      .from('quick_notes')
      .delete()
      .eq('id', noteToDelete.id);
    if (error) {
      toastError('Erro ao excluir', error.message);
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
      if (selectedNoteId === noteToDelete.id) setSelectedNoteId(null);
      toastSuccess('Nota excluída');
    }
    setNoteToDelete(null);
  };

  return (
    <DashboardLayout breadcrumbLabel="Notas">
      <div className="h-[calc(100vh-180px)] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Carregando notas...
          </div>
        ) : (
          <div className="flex h-full">
            <FolderSidebar
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={handleCreateFolderOpen}
              onEditFolder={handleEditFolder}
              onDeleteFolder={setFolderToDelete}
              noteCounts={noteCounts}
              totalCount={notes.length}
              currentUserId={user?.id}
            />
            <NoteList
              notes={visibleNotes}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              onCreateNote={handleCreateNote}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              folderName={currentFolderName}
              currentUserId={user?.id}
            />
            {selectedNote ? (
              <NoteEditor
                key={selectedNote.id}
                note={selectedNote}
                folders={folders}
                currentUserId={user?.id}
                onChange={handleOptimisticChange}
                onSave={handlePatchNote}
                onDelete={() => setNoteToDelete(selectedNote)}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
                <NotebookPen className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">Selecione uma nota ou crie uma nova</p>
              </div>
            )}
          </div>
        )}
      </div>

      <FolderFormDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        folder={editingFolder}
        onSubmit={handleSubmitFolder}
      />

      <AlertDialog open={!!folderToDelete} onOpenChange={(o) => !o && setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta "{folderToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As notas dentro dela não serão excluídas — vão continuar acessíveis em "Todas as notas".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFolder}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!noteToDelete} onOpenChange={(o) => !o && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNote}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
