import { Building2, User, UserCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientNameCellProps {
  client: {
    client_type?: 'company' | 'person';
    responsible_name?: string | null;
    company_name?: string | null;
    full_name?: string | null;
  };
  contactsCount?: number;
  className?: string;
}

export function ClientNameCell({ client, contactsCount, className = '' }: ClientNameCellProps) {
  const displayName = client.responsible_name || 
    (client.client_type === 'company' ? client.company_name : client.full_name) || 
    '-';
  
  const secondaryName = client.client_type === 'company' 
    ? client.company_name 
    : client.full_name;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        {client.client_type === 'company' ? (
          <Building2 className="h-5 w-5 text-primary" />
        ) : (
          <User className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="leading-tight">
        <p className="font-medium flex items-center gap-1.5">
          {displayName}
          {contactsCount && contactsCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <UserCheck className="h-3.5 w-3.5 text-primary/40 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{contactsCount} contato{contactsCount > 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </p>
        {client.responsible_name && (
          <p className="text-xs text-muted-foreground">
            {secondaryName}
          </p>
        )}
      </div>
    </div>
  );
}
