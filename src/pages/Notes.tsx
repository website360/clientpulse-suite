import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteFormModal } from '@/components/notes/NoteFormModal';
import { NoteFilters } from '@/components/notes/NoteFilters';
import { useToast } from '@/hooks/use-toast';

export default function Notes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<any[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchTags();
    }
  }, [user]);

  useEffect(() => {
    filterNotes();
  }, [notes, searchQuery, selectedTagIds]);

  const fetchNotes = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        note_tag_relationships(
          tag_id,
          note_tags(id, name, color)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar anotações',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      const notesWithTags = (data || []).map(note => ({
        ...note,
        tags: note.note_tag_relationships
          ?.map((rel: any) => rel.note_tags)
          .filter((tag: any) => tag !== null) || [],
      }));
      setNotes(notesWithTags);
    }
    setLoading(false);
  };

  const fetchTags = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('note_tags')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');

    setAvailableTags(data || []);
  };

  const filterNotes = () => {
    let filtered = notes;

    // Filter by tags
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(note =>
        note.tags?.some((tag: any) => selectedTagIds.includes(tag.id))
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.title?.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.link_url?.toLowerCase().includes(query) ||
        note.tags?.some((tag: any) => tag.name.toLowerCase().includes(query))
      );
    }

    setFilteredNotes(filtered);
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleEdit = (note: any) => {
    setSelectedNote(note);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Anotação excluída',
        description: 'Anotação excluída com sucesso',
      });
      fetchNotes();
    }
  };

  const handleColorChange = async (id: string, color: string) => {
    const { error } = await supabase
      .from('notes')
      .update({ color })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao atualizar cor',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      fetchNotes();
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedNote(null);
  };

  return (
    <DashboardLayout breadcrumbLabel="Ideias e Anotações">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ideias e Anotações</h1>
            <p className="text-muted-foreground mt-1">
              Organize suas ideias com texto, links, imagens e tags
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Anotação
          </Button>
        </div>

        <NoteFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          availableTags={availableTags}
          selectedTagIds={selectedTagIds}
          onTagToggle={handleTagToggle}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Carregando anotações...</div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedTagIds.length > 0
                ? 'Nenhuma anotação encontrada com os filtros aplicados'
                : 'Você ainda não tem anotações'}
            </p>
            {!searchQuery && selectedTagIds.length === 0 && (
              <Button onClick={() => setModalOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Criar primeira anotação
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onColorChange={handleColorChange}
              />
            ))}
          </div>
        )}

        <NoteFormModal
          open={modalOpen}
          onOpenChange={handleModalClose}
          note={selectedNote}
          onSuccess={fetchNotes}
        />
      </div>
    </DashboardLayout>
  );
}
