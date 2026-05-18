import { Wallet, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useFinancialAccount } from '@/contexts/FinancialAccountContext';

interface Props {
  /** Permite que o usuário escolha "Todas" para visão consolidada */
  allowAll?: boolean;
  /** Esconde o botão de gerenciar contas (útil em modais) */
  hideManage?: boolean;
  className?: string;
}

export function FinancialAccountSelector({ allowAll = true, hideManage = false, className }: Props) {
  const navigate = useNavigate();
  const { accounts, selectedAccountId, setSelectedAccountId, isLoading } = useFinancialAccount();

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Wallet className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedAccountId}
        onValueChange={(v) => setSelectedAccountId(v as any)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[220px] h-9">
          <SelectValue placeholder={isLoading ? 'Carregando...' : 'Conta'} />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="all">Todas as contas</SelectItem>}
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              <span className="flex items-center gap-2">
                {a.color && (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: a.color }}
                  />
                )}
                {a.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!hideManage && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => navigate('/financeiro/contas')}
          title="Gerenciar contas"
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
