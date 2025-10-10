import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Globe, Calendar, Pencil, Trash2 } from 'lucide-react';
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
    const daysUntilExpiry = Math.ceil(
      (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
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
          <Card>
            <CardContent className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum domínio cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione o primeiro domínio deste cliente
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Domínio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {domains.map((domain) => (
              <Card key={domain.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">{domain.domain}</h3>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Vencimento:</span>
                          <span className="font-medium">
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
                      </div>

                      <div>
                        <Badge variant={domain.owner === 'agency' ? 'default' : 'secondary'}>
                          Proprietário: {getOwnerLabel(domain.owner)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2">
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
                  </div>
                </CardContent>
              </Card>
            ))}
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
