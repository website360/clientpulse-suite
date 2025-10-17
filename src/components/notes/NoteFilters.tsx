import { Search, FileText, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface NoteFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
}

export function NoteFilters({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
}: NoteFiltersProps) {
  const types = [
    { value: 'all', label: 'Todas', icon: null },
    { value: 'text', label: 'Texto', icon: FileText },
    { value: 'link', label: 'Links', icon: LinkIcon },
    { value: 'image', label: 'Imagens', icon: ImageIcon },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar anotações..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {types.map((type) => {
          const Icon = type.icon;
          return (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTypeChange(type.value)}
              className="gap-2"
            >
              {Icon && <Icon className="h-4 w-4" />}
              {type.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
