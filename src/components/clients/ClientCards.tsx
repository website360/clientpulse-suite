import { Eye, Pencil, Trash2, Building2, User, Mail, Phone, FileText, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatPhone, formatCpfCnpj } from '@/lib/masks';

interface ClientCardsProps {
  clients: any[];
  onEdit: (client: any) => void;
  onView: (client: any) => void;
  onDelete: (clientId: string) => void;
}

export function ClientCards({ clients, onEdit, onView, onDelete }: ClientCardsProps) {

  if (clients.length === 0) {
    return (
      <Card className="card-elevated p-12 text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
        <p className="text-muted-foreground">
          Comece adicionando seu primeiro cliente
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map((client, index) => (
        <Card 
          key={client.id} 
          className="card-elevated card-interactive group animate-fade-in-up"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                  {client.client_type === 'company' ? (
                    <Building2 className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
                  ) : (
                    <User className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
                  )}
                </div>
                <div>
                  <Badge
                    variant={client.is_active ? 'default' : 'secondary'}
                    className={client.is_active ? 'bg-success/10 text-success border-success/20' : ''}
                  >
                    {client.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </div>

            <h3 className="font-semibold text-lg mb-1 line-clamp-1 flex items-center gap-1.5">
              {client.responsible_name || (client.client_type === 'company' ? client.company_name : client.full_name)}
              {(client.contacts_count?.[0]?.count || 0) > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <UserCheck className="h-3.5 w-3.5 text-primary/40 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{client.contacts_count[0].count} contato{client.contacts_count[0].count > 1 ? 's' : ''}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </h3>
            
            {client.responsible_name && (
              <p className="text-sm text-muted-foreground mb-3">
                {client.client_type === 'company' ? client.company_name : client.full_name}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{formatPhone(client.phone)}</span>
              </div>
              {client.cpf_cnpj && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">
                    {client.client_type === 'person' ? 'CPF' : 'CNPJ'}: {formatCpfCnpj(client.cpf_cnpj)}
                  </span>
                </div>
              )}
            </div>

            {(client.address_city || client.address_state) && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {client.address_city && client.address_state
                    ? `${client.address_city} - ${client.address_state}`
                    : client.address_city || client.address_state}
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-4 pt-0 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:scale-105 transition-transform"
              onClick={() => onView(client)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:scale-105 transition-transform"
              onClick={() => onEdit(client)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(client.id)}
              className="hover:scale-110 hover:text-destructive transition-all"
            >
              <Trash2 className="h-4 w-4 text-error" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
