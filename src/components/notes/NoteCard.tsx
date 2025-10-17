import { useState } from 'react';
import { Trash2, Edit, Palette, Link as LinkIcon, Image as ImageIcon, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

interface Note {
  id: string;
  title?: string;
  content: string;
  note_type: 'text' | 'link' | 'image';
  link_url?: string;
  image_url?: string;
  color: string;
  created_at: string;
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

  const renderContent = () => {
    switch (note.note_type) {
      case 'link':
        return (
          <div className="space-y-2">
            {note.title && <h3 className="font-semibold text-sm line-clamp-2">{note.title}</h3>}
            <a 
              href={note.link_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 line-clamp-1"
            >
              <LinkIcon className="h-3 w-3 flex-shrink-0" />
              {note.link_url}
            </a>
            {note.content && <p className="text-xs text-muted-foreground line-clamp-3">{note.content}</p>}
          </div>
        );
      
      case 'image':
        return (
          <div className="space-y-2">
            {note.image_url && (
              <img 
                src={note.image_url} 
                alt={note.title || 'Nota'} 
                className="w-full h-32 object-cover rounded"
              />
            )}
            {note.title && <p className="text-xs font-medium line-clamp-2">{note.title}</p>}
          </div>
        );
      
      default: // text
        return (
          <div className="space-y-2">
            {note.title && <h3 className="font-semibold text-sm line-clamp-2">{note.title}</h3>}
            <p className="text-xs text-muted-foreground line-clamp-6 whitespace-pre-wrap">{note.content}</p>
          </div>
        );
    }
  };

  const getIcon = () => {
    switch (note.note_type) {
      case 'link': return <LinkIcon className="h-3 w-3" />;
      case 'image': return <ImageIcon className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  return (
    <>
      <Card 
        className="group relative h-[280px] p-4 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden"
        style={{ 
          backgroundColor: note.color,
          backgroundImage: `linear-gradient(135deg, ${note.color} 0%, ${note.color}ee 100%)`
        }}
        onClick={() => onEdit(note)}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              {getIcon()}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Palette className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {NOTE_COLORS.map((color) => (
                    <DropdownMenuItem
                      key={color.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        onColorChange(note.id, color.value);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-4 w-4 rounded-full border" 
                          style={{ backgroundColor: color.value }}
                        />
                        {color.label}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(note);
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
          
          <div className="mt-2 text-[10px] text-muted-foreground">
            {new Date(note.created_at).toLocaleDateString('pt-BR')}
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
