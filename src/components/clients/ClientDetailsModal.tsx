import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, User, Mail, Phone, MapPin, FileText, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
}

export function ClientDetailsModal({ open, onOpenChange, client }: ClientDetailsModalProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client && open) {
      fetchClientTickets();
    }
  }, [client, open]);

  const fetchClientTickets = async () => {
    if (!client) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*, departments(name)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatCpfCnpj = (doc: string) => {
    if (!doc) return '-';
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              {client.client_type === 'company' ? (
                <Building2 className="h-8 w-8 text-primary" />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">
                {client.full_name || client.company_name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {client.client_type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </Badge>
                <Badge
                  variant={client.is_active ? 'default' : 'secondary'}
                  className={client.is_active ? 'bg-success/10 text-success border-success/20' : ''}
                >
                  {client.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="tickets">
              Tickets {tickets.length > 0 && `(${tickets.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-6">
            {/* Contact Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Contato</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{formatPhone(client.phone)}</p>
                    </div>
                  </div>
                  {client.cpf_cnpj && (
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {client.client_type === 'person' ? 'CPF' : 'CNPJ'}
                        </p>
                        <p className="font-medium font-mono">{formatCpfCnpj(client.cpf_cnpj)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Personal Info */}
            {client.client_type === 'person' && (client.birth_date || client.gender) && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Dados Pessoais</h3>
                  <div className="space-y-3">
                    {client.birth_date && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                          <p className="font-medium">
                            {format(new Date(client.birth_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                    )}
                    {client.gender && (
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Gênero</p>
                          <p className="font-medium capitalize">
                            {client.gender === 'male' ? 'Masculino' :
                             client.gender === 'female' ? 'Feminino' :
                             client.gender === 'other' ? 'Outro' : 'Prefiro não dizer'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Address */}
            {(client.address_street || client.address_city) && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Endereço</h3>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      {client.address_street && (
                        <p>
                          {client.address_street}
                          {client.address_number && `, ${client.address_number}`}
                        </p>
                      )}
                      {client.address_complement && (
                        <p className="text-sm text-muted-foreground">{client.address_complement}</p>
                      )}
                      {client.address_neighborhood && <p>{client.address_neighborhood}</p>}
                      {(client.address_city || client.address_state) && (
                        <p>
                          {client.address_city}
                          {client.address_state && ` - ${client.address_state}`}
                        </p>
                      )}
                      {client.address_cep && (
                        <p className="text-sm text-muted-foreground">CEP: {client.address_cep}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Company Info */}
            {client.client_type === 'company' && client.responsible_name && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Informações da Empresa</h3>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Responsável</p>
                      <p className="font-medium">{client.responsible_name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tickets" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando tickets...</p>
            ) : tickets.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum ticket encontrado</h3>
                  <p className="text-muted-foreground">
                    Este cliente ainda não criou nenhum ticket
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">#{ticket.ticket_number}</span>
                            <Badge variant="outline" className="text-xs">
                              {ticket.departments?.name}
                            </Badge>
                            <Badge
                              className={`text-xs ${
                                ticket.priority === 'urgent' || ticket.priority === 'high'
                                  ? 'badge-priority-high'
                                  : ticket.priority === 'medium'
                                  ? 'badge-priority-medium'
                                  : 'badge-priority-low'
                              }`}
                            >
                              {ticket.priority}
                            </Badge>
                          </div>
                          <p className="font-medium mb-1">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Criado em {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        <Badge
                          className={
                            ticket.status === 'resolved' || ticket.status === 'closed'
                              ? 'badge-status-resolved'
                              : 'badge-status-open'
                          }
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
