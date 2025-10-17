import { useState, useEffect } from 'react';
import { Plus, Tag as TagIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagBadge } from './TagBadge';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  recentTags?: Tag[];
}

const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export function TagSelector({ selectedTags, onTagsChange, recentTags = [] }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('note_tags')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast({
        title: 'Erro ao carregar tags',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setAllTags(data || []);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('note_tags')
      .insert({
        user_id: user.id,
        name: newTagName.trim(),
        color: newTagColor,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao criar tag',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setAllTags([...allTags, data]);
    onTagsChange([...selectedTags, data]);
    setNewTagName('');
    setShowCreateForm(false);
    
    toast({
      title: 'Tag criada!',
      description: `Tag "${data.name}" criada com sucesso.`,
    });
  };

  const toggleTag = (tag: Tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    if (isSelected) {
      onTagsChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const availableTags = allTags.filter(
    tag => !selectedTags.some(st => st.id === tag.id)
  );

  const suggestedTags = recentTags.filter(
    tag => !selectedTags.some(st => st.id === tag.id)
  );

  return (
    <div className="space-y-3">
      <Label>Tags</Label>
      
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color}
            onRemove={() => onTagsChange(selectedTags.filter(t => t.id !== tag.id))}
          />
        ))}
      </div>

      {/* Suggested Recent Tags */}
      {suggestedTags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tags recentes (clique para adicionar)</Label>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag)}
                className="transition-opacity hover:opacity-80"
                type="button"
              >
                <TagBadge name={tag.name} color={tag.color} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Tag Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" type="button">
            <Plus className="h-4 w-4" />
            Adicionar Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            {/* Available Tags */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tags Disponíveis</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag)}
                      className="transition-opacity hover:opacity-80"
                      type="button"
                    >
                      <TagBadge name={tag.name} color={tag.color} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Create New Tag */}
            {!showCreateForm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="w-full gap-2"
                type="button"
              >
                <TagIcon className="h-4 w-4" />
                Criar Nova Tag
              </Button>
            ) : (
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs text-muted-foreground">Nova Tag</Label>
                <Input
                  placeholder="Nome da tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                />
                <div className="space-y-2">
                  <Label className="text-xs">Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          newTagColor === color ? 'border-foreground' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        type="button"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateTag}
                    className="flex-1"
                    type="button"
                  >
                    Criar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewTagName('');
                    }}
                    type="button"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
