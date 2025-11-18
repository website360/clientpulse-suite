import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Globe, Calendar, Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DomainFormModal } from '@/components/domains/DomainFormModal';
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

interface Domain {
  id: string;
  domain: string;
  expires_at: string;
  owner: 'agency' | 'client';
  client_id: string;
  is_cloudflare?: boolean;
}

interface ClientDomainsProps {
  clientId: string;
}

export function ClientDomains({ clientId }: ClientDomainsProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, [clientId]);

  const fetchDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('client_id', clientId)
        .order('expires_at', { ascending: true });

      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
      toast.error('Erro ao carregar domínios');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDomain) return;

    try {
      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', deletingDomain.id);

      if (error) throw error;

      toast.success('Domínio excluído com sucesso!');
      fetchDomains();
      setDeletingDomain(null);
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast.error('Erro ao excluir domínio');
    }
  };

  const handleSuccess = () => {
    fetchDomains();
    setEditingDomain(null);
    setIsModalOpen(false);
  };

  const getOwnerLabel = (owner: 'agency' | 'client') => {
    return owner === 'agency' ? 'Agência' : 'Cliente';
  };

  const isExpiringSoon = (expiresAt: string) => {
    const exp = parse(expiresAt, 'yyyy-MM-dd', new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30;
  };

  const isExpired = (expiresAt: string) => {
    const exp = parse(expiresAt, 'yyyy-MM-dd', new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp.getTime() < today.getTime();
  };

  if (loading) {
    return <div className="text-center py-8">Carregando domínios...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Domínio
          </Button>
        </div>

        {domains.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum domínio cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione o primeiro domínio deste cliente
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Domínio
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {domain.domain}
                        {domain.is_cloudflare && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Shield className="h-4 w-4 text-orange-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Gerenciado pela Cloudflare</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(parse(domain.expires_at, 'yyyy-MM-dd', new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        {isExpired(domain.expires_at) && (
                          <Badge variant="destructive">Vencido</Badge>
                        )}
                        {!isExpired(domain.expires_at) && isExpiringSoon(domain.expires_at) && (
                          <Badge variant="secondary" className="bg-warning/20 text-warning">
                            Vence em breve
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={domain.owner === 'agency' ? 'default' : 'secondary'}>
                        {getOwnerLabel(domain.owner)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingDomain(domain)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingDomain(domain)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <DomainFormModal
        isOpen={isModalOpen || !!editingDomain}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDomain(null);
        }}
        onSuccess={handleSuccess}
        domain={editingDomain || undefined}
      />

      <AlertDialog open={!!deletingDomain} onOpenChange={() => setDeletingDomain(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o domínio "{deletingDomain?.domain}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
