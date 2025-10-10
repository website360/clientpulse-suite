import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Edit, Trash2, Mail, User2, UserPlus, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContactsListProps {
  contacts: any[];
  onEdit: (contact: any) => void;
  onContactsChange: () => void;
}

export function ContactsList({ contacts, onEdit, onContactsChange }: ContactsListProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [accessCredentials, setAccessCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDelete = (contactId: string) => {
    setContactToDelete(contactId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      const { error } = await supabase
        .from('client_contacts')
        .delete()
        .eq('id', contactToDelete);

      if (error) throw error;

      toast({
        title: 'Contato excluído',
        description: 'O contato foi excluído com sucesso.',
      });

      onContactsChange();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o contato.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const handleGrantAccess = async (contact: any) => {
    if (contact.user_id) {
      toast({
        title: 'Acesso já concedido',
        description: 'Este contato já possui acesso ao sistema.',
      });
      return;
    }

    setGrantingAccess(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-contact-user', {
        body: { contactId: contact.id },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setAccessCredentials({
        email: data.email,
        password: data.tempPassword,
      });
      setAccessDialogOpen(true);

      onContactsChange();
    } catch (error: any) {
      toast({
        title: 'Erro ao conceder acesso',
        description: error.message || 'Não foi possível criar o acesso ao sistema.',
        variant: 'destructive',
      });
    } finally {
      setGrantingAccess(false);
    }
  };

  const handleCopyPassword = () => {
    if (accessCredentials) {
      navigator.clipboard.writeText(accessCredentials.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copiado!',
        description: 'Senha copiada para a área de transferência.',
      });
    }
  };

  if (contacts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <User2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum contato cadastrado</h3>
        <p className="text-muted-foreground">
          Comece adicionando um novo contato para este cliente
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{contact.name}</span>
                  </div>
                </TableCell>
                <TableCell>{contact.department}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-primary hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                </TableCell>
                <TableCell>
                  {contact.user_id ? (
                    <Badge variant="default">Com Acesso</Badge>
                  ) : (
                    <Badge variant="outline">Sem Acesso</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!contact.user_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGrantAccess(contact)}
                        disabled={grantingAccess}
                        title="Dar Acesso ao Sistema"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Dar Acesso
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(contact.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso Concedido com Sucesso!</DialogTitle>
            <DialogDescription>
              O acesso ao sistema foi criado. Compartilhe estas credenciais com o contato:
            </DialogDescription>
          </DialogHeader>
          {accessCredentials && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  {accessCredentials.email}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha Temporária</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                    {accessCredentials.password}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPassword}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Importante:</strong> O contato deverá trocar a senha no primeiro acesso.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => {
              setAccessDialogOpen(false);
              setAccessCredentials(null);
            }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
