import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TagBadge } from './TagBadge';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface NoteFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  availableTags: Tag[];
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
}

export function NoteFilters({
  searchQuery,
  onSearchChange,
  availableTags,
  selectedTagIds,
  onTagToggle,
}: NoteFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar anotações..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-11 h-11 text-base"
        />
      </div>

      {availableTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Filtrar por tags:</span>
            {selectedTagIds.length > 0 && (
              <Button
                variant="ghost"
                size="default"
                className="h-9"
                onClick={() => selectedTagIds.forEach(id => onTagToggle(id))}
              >
                Limpar filtros
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagToggle(tag.id)}
                className={`transition-opacity ${
                  selectedTagIds.includes(tag.id) ? 'opacity-100' : 'opacity-50 hover:opacity-75'
                }`}
              >
                <TagBadge name={tag.name} color={tag.color} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
