import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GripVertical, Plus, Save, Download, Share2, MoreVertical, Trash2, Edit, Loader2, Layout } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import FinancialWidget from './widgets/FinancialWidget';
import ProductivityWidget from './widgets/ProductivityWidget';
import TicketsWidget from './widgets/TicketsWidget';
import DefaultWidget from './widgets/DefaultWidget';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Tipos de widgets disponíveis
const WIDGET_TYPES = {
  financial: { name: 'Resumo Financeiro', component: FinancialWidget },
  productivity: { name: 'Produtividade', component: ProductivityWidget },
  tickets: { name: 'Tickets', component: TicketsWidget },
  default: { name: 'Inadimplência', component: DefaultWidget },
};

interface WidgetConfig {
  id: string;
  type: keyof typeof WIDGET_TYPES;
}

interface SortableWidgetProps {
  widget: WidgetConfig;
  onRemove: (id: string) => void;
}

function SortableWidget({ widget, onRemove }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const WidgetComponent = WIDGET_TYPES[widget.type].component;

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </div>
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur text-destructive hover:text-destructive"
          onClick={() => onRemove(widget.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <WidgetComponent />
    </div>
  );
}

export default function CustomDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Carregar dashboards salvos
  const { data: dashboards, isLoading: loadingDashboards } = useQuery({
    queryKey: ['dashboard-configs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Salvar dashboard
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const dashboardData = {
        user_id: user.id,
        name: dashboardName,
        description: dashboardDescription,
        layout: widgets,
        is_default: !currentDashboardId && !dashboards?.length,
      };

      if (currentDashboardId) {
        const { error } = await supabase
          .from('dashboard_configs')
          .update(dashboardData)
          .eq('id', currentDashboardId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('dashboard_configs')
          .insert(dashboardData)
          .select()
          .single();
        if (error) throw error;
        setCurrentDashboardId(data.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-configs'] });
      toast({ title: 'Dashboard salvo com sucesso!' });
      setSaveDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar dashboard', description: error.message, variant: 'destructive' });
    },
  });

  // Deletar dashboard
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dashboard_configs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-configs'] });
      toast({ title: 'Dashboard deletado com sucesso!' });
      if (currentDashboardId === currentDashboardId) {
        setCurrentDashboardId(null);
        setWidgets([]);
      }
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addWidget = (type: keyof typeof WIDGET_TYPES) => {
    const newWidget: WidgetConfig = {
      id: `${type}-${Date.now()}`,
      type,
    };
    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id));
  };

  const loadDashboard = (dashboardId: string) => {
    const dashboard = dashboards?.find((d) => d.id === dashboardId);
    if (dashboard) {
      setCurrentDashboardId(dashboard.id);
      setWidgets(dashboard.layout as WidgetConfig[]);
      setDashboardName(dashboard.name);
      setDashboardDescription(dashboard.description || '');
      toast({ title: `Dashboard "${dashboard.name}" carregado!` });
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const dashboardElement = document.getElementById('dashboard-content');
      if (!dashboardElement) return;

      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`dashboard-${dashboardName || 'custom'}-${new Date().getTime()}.pdf`);
      toast({ title: 'Dashboard exportado em PDF!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPNG = async () => {
    setIsExporting(true);
    try {
      const dashboardElement = document.getElementById('dashboard-content');
      if (!dashboardElement) return;

      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `dashboard-${dashboardName || 'custom'}-${new Date().getTime()}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast({ title: 'Dashboard exportado em PNG!' });
        }
      });
    } catch (error) {
      toast({ title: 'Erro ao exportar PNG', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  if (loadingDashboards) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Dashboard Customizável
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Carregar Dashboard */}
              {dashboards && dashboards.length > 0 && (
                <Select onValueChange={loadDashboard} value={currentDashboardId || undefined}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Carregar Dashboard" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboards.map((dashboard) => (
                      <SelectItem key={dashboard.id} value={dashboard.id}>
                        {dashboard.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Adicionar Widget */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Widget
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(WIDGET_TYPES).map(([key, value]) => (
                    <DropdownMenuItem key={key} onClick={() => addWidget(key as keyof typeof WIDGET_TYPES)}>
                      {value.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Ações */}
              <Button onClick={() => setSaveDialogOpen(true)} className="gap-2">
                <Save className="w-4 h-4" />
                Salvar
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToPDF} disabled={isExporting || widgets.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPNG} disabled={isExporting || widgets.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar PNG
                  </DropdownMenuItem>
                  {currentDashboardId && (
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(currentDashboardId)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deletar Dashboard
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Dashboard Grid */}
      <div id="dashboard-content" className="relative">
        {widgets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layout className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Dashboard Vazio</h3>
              <p className="text-muted-foreground text-center mb-4">
                Clique em "Adicionar Widget" para começar a personalizar seu dashboard
              </p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {widgets.map((widget) => (
                  <SortableWidget key={widget.id} widget={widget} onRemove={removeWidget} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentDashboardId ? 'Atualizar Dashboard' : 'Salvar Dashboard'}</DialogTitle>
            <DialogDescription>
              Configure um nome e descrição para seu dashboard personalizado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Dashboard</Label>
              <Input
                id="name"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                placeholder="Ex: Dashboard Executivo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={dashboardDescription}
                onChange={(e) => setDashboardDescription(e.target.value)}
                placeholder="Descreva o propósito deste dashboard..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!dashboardName || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isExporting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-semibold">Exportando dashboard...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
