import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PayConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id: string;
    description: string;
    amount: number;
    due_date: string;
  } | null;
  onConfirm: (data: { id: string; payment_date: string; amount: number }) => void;
}

export function PayConfirmModal({ open, onOpenChange, account, onConfirm }: PayConfirmModalProps) {
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [amountValue, setAmountValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');

  // Formata o valor inicial quando o modal abre
  useEffect(() => {
    if (account && open) {
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(account.amount);
      setDisplayValue(formatted);
      setAmountValue(account.amount.toFixed(2));
      setPaymentDate(new Date());
    }
  }, [account, open]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remove tudo exceto dígitos
    value = value.replace(/\D/g, '');
    // Converte para número e divide por 100 para ter os centavos
    const numValue = parseInt(value || '0') / 100;
    // Formata como moeda BRL
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
    setDisplayValue(formatted);
    setAmountValue(numValue.toFixed(2));
  };

  const handleConfirm = () => {
    if (!account) return;
    
    const formatDateToString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    onConfirm({
      id: account.id,
      payment_date: formatDateToString(paymentDate),
      amount: parseFloat(amountValue)
    });
    onOpenChange(false);
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Pagamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descrição</Label>
            <p className="text-sm text-muted-foreground">{account.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Data de Pagamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor Pago</Label>
            <Input
              id="amount"
              value={displayValue}
              onChange={handleAmountChange}
              placeholder="R$ 0,00"
            />
            <p className="text-xs text-muted-foreground">
              Valor original: {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(account.amount)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
