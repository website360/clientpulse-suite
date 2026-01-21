import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, TrendingUp, TrendingDown, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
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
  icon,
  items,
  showValues,
  onToggleVisibility,
  linkTo,
  linkLabel = 'Ver detalhes',
  type,
}: FinancialSummaryCardProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const isReceivable = type === 'receivable';

  const getVariantStyles = (variant?: string) => {
    switch (variant) {
      case 'success':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-foreground';
    }
  };

  const getVariantIcon = (variant?: string) => {
    switch (variant) {
      case 'success':
        return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
      case 'warning':
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case 'danger':
        return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return isReceivable 
          ? <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
          : <TrendingDown className="h-3.5 w-3.5 text-purple-500" />;
    }
  };

  return (
    <Card className="relative overflow-hidden border-border/50">
      {/* Color accent */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        isReceivable 
          ? "bg-emerald-500" 
          : "bg-purple-500"
      )} />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleVisibility}
          >
            {showValues ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Total */}
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Total Geral
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {showValues ? formatCurrency(total) : '•••••••'}
          </p>
        </div>

        {/* Items */}
        <div className="grid grid-cols-2 gap-3">
          {items.map((item, index) => (
            <div 
              key={index}
              className={cn(
                "rounded-lg p-3 bg-muted/50",
                "border border-transparent hover:border-border transition-colors"
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {getVariantIcon(item.variant)}
                <span className="text-xs text-muted-foreground truncate">
                  {item.label}
                </span>
              </div>
              <p className={cn(
                "text-lg font-semibold",
                getVariantStyles(item.variant)
              )}>
                {showValues ? formatCurrency(item.value) : '•••••'}
              </p>
            </div>
          ))}
        </div>

        {/* Link */}
        <Link 
          to={linkTo}
          className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline pt-2"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
