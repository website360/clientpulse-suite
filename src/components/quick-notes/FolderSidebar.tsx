import { Folder, FolderPlus, Inbox, Users, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface QuickNoteFolder {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  is_shared: boolean;
  position: number;
}

interface FolderSidebarProps {
  folders: QuickNoteFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: QuickNoteFolder) => void;
  onDeleteFolder: (folder: QuickNoteFolder) => void;
  noteCounts: Record<string, number>;
  totalCount: number;
  currentUserId: string | undefined;
}

export function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  noteCounts,
  totalCount,
  currentUserId,
}: FolderSidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Pastas</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onCreateFolder}
          title="Nova pasta"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <button
          onClick={() => onSelectFolder(null)}
          className={cn(
            'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
            selectedFolderId === null
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-muted'
          )}
        >
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Todas as notas
          </span>
          <span className="text-xs text-muted-foreground">{totalCount}</span>
        </button>

        <div className="mt-3 space-y-0.5">
          {folders.map((folder) => {
            const isOwner = folder.user_id === currentUserId;
            const active = selectedFolderId === folder.id;
            return (
              <div
                key={folder.id}
                className={cn(
                  'group flex items-center rounded-md transition-colors',
                  active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                )}
              >
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  className="flex flex-1 items-center justify-between px-3 py-2 text-sm text-left"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder
                      className="h-4 w-4 shrink-0"
                      style={{ color: folder.color }}
                    />
                    <span className={cn('truncate', active && 'font-medium')}>
                      {folder.name}
                    </span>
                    {folder.is_shared && (
                      <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {noteCounts[folder.id] ?? 0}
                  </span>
                </button>
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 mr-1 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditFolder(folder)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteFolder(folder)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}

          {folders.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nenhuma pasta ainda
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
