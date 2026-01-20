import { Eye, Pencil, Trash2, Building2, User, Mail, Phone, FileText, MoreHorizontal, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatPhone, formatCpfCnpj } from '@/lib/masks';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { cn } from '@/lib/utils';

interface ClientCardsProps {
  clients: any[];
  onEdit: (client: any) => void;
  onView: (client: any) => void;
  onDelete: (clientId: string) => void;
}

export function ClientCards({ clients, onEdit, onView, onDelete }: ClientCardsProps) {
  if (clients.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
        <p className="text-muted-foreground text-sm">
          Comece adicionando seu primeiro cliente
        </p>
      </Card>
    );
  }

  const getClientName = (client: any) => {
    return client.responsible_name || 
           (client.client_type === 'company' ? client.company_name : client.full_name) ||
           'Cliente';
  };

  const getClientSubtitle = (client: any) => {
    if (client.responsible_name) {
      return client.client_type === 'company' ? client.company_name : client.full_name;
    }
    return client.email;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {clients.map((client, index) => (
        <Card 
          key={client.id} 
          className={cn(
            "group border bg-card transition-all duration-300 cursor-pointer",
            "hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => onView(client)}
        >
          <CardContent className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <AvatarInitials 
                  name={getClientName(client)} 
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {getClientName(client)}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {getClientSubtitle(client)}
                  </p>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(client); }}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(client); }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete(client.id); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Info Grid */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {client.client_type === 'company' ? (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className="text-muted-foreground truncate">
                  {client.client_type === 'company' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-muted-foreground">{formatPhone(client.phone)}</span>
              </div>

              {client.cpf_cnpj && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {client.client_type === 'person' ? 'CPF' : 'CNPJ'}: {formatCpfCnpj(client.cpf_cnpj)}
                  </span>
                </div>
              )}
            </div>

            {/* Status and Location */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Badge
                variant={client.is_active ? 'default' : 'secondary'}
                className={cn(
                  "font-medium",
                  client.is_active 
                    ? 'bg-secondary text-primary hover:bg-secondary/80' 
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <span className={cn(
                  "mr-1.5 h-1.5 w-1.5 rounded-full",
                  client.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'
                )} />
                {client.is_active ? 'Ativo' : 'Inativo'}
              </Badge>

              {(client.address_city || client.address_state) && (
                <span className="text-xs text-muted-foreground">
                  {client.address_city && client.address_state
                    ? `${client.address_city}, ${client.address_state}`
                    : client.address_city || client.address_state}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
