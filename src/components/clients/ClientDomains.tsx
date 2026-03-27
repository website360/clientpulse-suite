import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pencil, Trash2, Globe, Calendar, Plus, Shield, MoreVertical, Circle } from 'lucide-react';
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
          <div className="text-center py-12 bg-card rounded-xl border">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-sm font-semibold mb-1">Nenhum domínio cadastrado</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              Adicione o primeiro domínio deste cliente
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Domínio
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 rounded-xl">
              <div className="col-span-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Domínio</span>
              </div>
              <div className="col-span-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Vencimento</span>
              </div>
              <div className="col-span-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Proprietário</span>
              </div>
              <div className="col-span-1 text-right">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ações</span>
              </div>
            </div>

            {/* Domain Rows as Cards */}
            {domains.map((domain, index) => (
              <Card
                key={domain.id}
                className="rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 animate-fade-in-up overflow-hidden"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  {/* Domínio */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-[14px] font-medium text-foreground truncate">
                        {domain.domain}
                      </p>
                      {domain.is_cloudflare && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Shield className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gerenciado pela Cloudflare</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Vencimento */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] text-foreground">
                        {format(parse(domain.expires_at, 'yyyy-MM-dd', new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      {isExpired(domain.expires_at) && (
                        <Badge
                          variant="default"
                          className="font-medium px-3 py-1 flex items-center gap-1.5 w-fit bg-red-50 text-red-700 border-0 hover:bg-red-50"
                        >
                          <Circle className="h-2 w-2 fill-red-500 text-red-500" />
                          Vencido
                        </Badge>
                      )}
                      {!isExpired(domain.expires_at) && isExpiringSoon(domain.expires_at) && (
                        <Badge
                          variant="default"
                          className="font-medium px-3 py-1 flex items-center gap-1.5 w-fit bg-amber-50 text-amber-700 border-0 hover:bg-amber-50"
                        >
                          <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
                          Vence em breve
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Proprietário */}
                  <div className="col-span-3">
                    <Badge
                      className={
                        domain.owner === 'agency'
                          ? 'bg-[#fdc101] text-[#1A3366] hover:bg-[#fdc101]/80'
                          : 'bg-[#1A3366] text-[#ffffff] hover:bg-[#1A3366]/80'
                      }
                    >
                      {getOwnerLabel(domain.owner)}
                    </Badge>
                  </div>

                  {/* Ações */}
                  <div className="col-span-1 flex items-center justify-end flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg p-2">
                        <DropdownMenuItem onClick={() => setEditingDomain(domain)} className="rounded-lg px-3 py-2.5 cursor-pointer">
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingDomain(domain)}
                          className="text-destructive focus:text-destructive rounded-lg px-3 py-2.5 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
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
