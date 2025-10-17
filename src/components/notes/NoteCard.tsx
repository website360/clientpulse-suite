import { MoreVertical, Pencil, Trash2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { TagBadge } from './TagBadge';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Note {
  id: string;
  title?: string | null;
  content: string;
  link_url?: string | null;
  image_url?: string | null;
  color: string;
  created_at: string;
  tags?: Tag[];
}

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
}

const NOTE_COLORS = [
  { value: '#fef08a', label: 'Amarelo' },
  { value: '#fecdd3', label: 'Rosa' },
  { value: '#bfdbfe', label: 'Azul' },
  { value: '#bbf7d0', label: 'Verde' },
  { value: '#fed7aa', label: 'Laranja' },
  { value: '#e9d5ff', label: 'Roxo' },
];

export function NoteCard({ note, onEdit, onDelete, onColorChange }: NoteCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const renderContent = () => {
    return (
      <div className="space-y-2 flex-1">
        <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-6">
          {note.content}
        </p>
        
        {note.link_url && (
          <a
            href={note.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <LinkIcon className="h-3 w-3 flex-shrink-0" />
            {note.link_url}
          </a>
        )}
        
        {note.image_url && (
          <img
            src={note.image_url}
            alt={note.title || 'Note image'}
            className="w-full h-32 object-cover rounded mt-2"
          />
        )}
      </div>
    );
  };

  return (
    <>
      <Card
        className="transition-all hover:shadow-lg cursor-pointer"
        style={{
          backgroundColor: note.color,
          backgroundImage: `linear-gradient(135deg, ${note.color} 0%, ${note.color}ee 100%)`,
        }}
        onClick={() => onEdit(note)}
      >
        <div className="p-4 space-y-3 group flex flex-col h-full">
          <div className="flex items-start justify-between gap-2">
            {note.title && (
              <h3 className="font-medium text-sm flex-1 min-w-0 truncate">{note.title}</h3>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(note);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Mudar cor</DropdownMenuLabel>
                {NOTE_COLORS.map((color) => (
                  <DropdownMenuItem
                    key={color.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorChange(note.id, color.value);
                    }}
                  >
                    <div
                      className="h-4 w-4 rounded-full border mr-2"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.label}
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {renderContent()}

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {note.tags.map((tag) => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} />
              ))}
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t mt-auto">
            {new Date(note.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A anotação será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(note.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
