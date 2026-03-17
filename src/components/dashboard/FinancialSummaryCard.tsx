import { Button } from '@/components/ui/button';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface FinancialItem {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

interface FinancialSummaryCardProps {
  title: string;
  icon: React.ReactNode;
  items: FinancialItem[];
  showValues: boolean;
  onToggleVisibility: () => void;
  linkTo: string;
  linkLabel?: string;
  type: 'receivable' | 'payable';
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function FinancialSummaryCard({
  title,
  items,
  showValues,
  onToggleVisibility,
  linkTo,
  linkLabel = 'Ver detalhes',
  type,
}: FinancialSummaryCardProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const isReceivable = type === 'receivable';

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Color accent line */}
      <div className={cn(
        "h-[2px]",
        isReceivable ? "bg-emerald-500" : "bg-red-400"
      )} />
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 -mr-1"
          onClick={onToggleVisibility}
        >
          {showValues ? (
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Total */}
      <div className="px-6 pt-5 pb-4">
        <p className="text-[11px] text-muted-foreground mb-1">Total</p>
        <p className={cn(
          "text-3xl font-bold tracking-tight tabular-nums",
          isReceivable ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}>
          {showValues ? formatCurrency(total) : 'R$ •••••'}
        </p>
      </div>

      {/* Items — simple rows with border separator */}
      <div className="border-t">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between px-6 py-3.5",
              index < items.length - 1 && "border-b"
            )}
          >
            <span className="text-[13px] text-muted-foreground">{item.label}</span>
            <span className="text-[15px] font-semibold tabular-nums text-foreground">
              {showValues ? formatCurrency(item.value) : '•••••'}
            </span>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <div className="border-t px-6 py-3">
        <Link
          to={linkTo}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
