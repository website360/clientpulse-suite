import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export type BulkActionType = 'single' | 'following' | 'all';

interface BulkActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'edit' | 'delete';
  occurrenceType: string;
  onConfirm: (type: BulkActionType) => void;
}

export function BulkActionModal({
  open,
  onOpenChange,
  actionType,
  occurrenceType,
  onConfirm,
}: BulkActionModalProps) {
  const [selectedOption, setSelectedOption] = useState<BulkActionType>('single');

  const handleConfirm = () => {
    onConfirm(selectedOption);
    onOpenChange(false);
  };

  const getTitle = () => {
    if (actionType === 'edit') {
      return 'Editar Cobrança Recorrente';
    }
    return 'Excluir Cobrança Recorrente';
  };

  const getDescription = () => {
    if (actionType === 'edit') {
      return 'Esta cobrança faz parte de uma série. Como deseja proceder?';
    }
    return 'Esta cobrança faz parte de uma série. Quais cobranças deseja excluir?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <RadioGroup value={selectedOption} onValueChange={(value) => setSelectedOption(value as BulkActionType)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="single" />
            <Label htmlFor="single" className="cursor-pointer">
              Apenas esta cobrança
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="following" id="following" />
            <Label htmlFor="following" className="cursor-pointer">
              Esta e as próximas cobranças
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="cursor-pointer">
              Todas as cobranças da série
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} variant={actionType === 'delete' ? 'destructive' : 'default'}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
