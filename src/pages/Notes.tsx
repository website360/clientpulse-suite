import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteFormModal } from '@/components/notes/NoteFormModal';
import { NoteFilters } from '@/components/notes/NoteFilters';
import { toast } from '@/hooks/use-toast';

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    fetchNotes();
  }, [user]);

  useEffect(() => {
    filterNotes();
  }, [notes, searchQuery, selectedType]);

  const fetchNotes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as anotações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];

    if (selectedType !== 'all') {
      filtered = filtered.filter((note) => note.note_type === selectedType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((note) => 
        note.title?.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query) ||
        note.link_url?.toLowerCase().includes(query)
      );
    }

    setFilteredNotes(filtered);
  };

  const handleEdit = (note: any) => {
    setSelectedNote(note);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Anotação excluída',
        description: 'A anotação foi excluída com sucesso',
      });

      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a anotação',
        variant: 'destructive',
      });
    }
  };

  const handleColorChange = async (id: string, color: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ color })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cor atualizada',
        description: 'A cor da anotação foi alterada',
      });

      fetchNotes();
    } catch (error) {
      console.error('Error updating color:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a cor',
        variant: 'destructive',
      });
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
              Organize suas ideias, links e imagens em post-its coloridos
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
          selectedType={selectedType}
          onTypeChange={setSelectedType}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Carregando anotações...</div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedType !== 'all'
                ? 'Nenhuma anotação encontrada com os filtros aplicados'
                : 'Você ainda não tem anotações'}
            </p>
            {!searchQuery && selectedType === 'all' && (
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
