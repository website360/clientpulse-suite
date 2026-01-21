import { useState, useEffect, useCallback } from 'react';
import { DashboardWidget, WidgetType, DEFAULT_WIDGETS, WIDGET_CONFIGS } from '@/types/dashboard';

const STORAGE_KEY = 'dashboard-layout-v2';

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: DashboardWidget[] = JSON.parse(saved);
        setWidgets(parsed);
      } catch (error) {
        console.error('Error loading dashboard layout:', error);
      }
    }
  }, []);

  const saveWidgets = useCallback((newWidgets: DashboardWidget[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
    setWidgets(newWidgets);
  }, []);

  const reorderWidgets = useCallback((activeId: string, overId: string) => {
    const oldIndex = widgets.findIndex(w => w.id === activeId);
    const newIndex = widgets.findIndex(w => w.id === overId);
    
    if (oldIndex === -1 || newIndex === -1) return;

    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(oldIndex, 1);
    newWidgets.splice(newIndex, 0, removed);
    
    const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));
    saveWidgets(reordered);
  }, [widgets, saveWidgets]);

  const changeWidgetSize = useCallback((widgetId: string, size: DashboardWidget['size']) => {
    const newWidgets = widgets.map(w => 
      w.id === widgetId ? { ...w, size } : w
    );
    saveWidgets(newWidgets);
  }, [widgets, saveWidgets]);

  const addWidget = useCallback((type: WidgetType) => {
    if (widgets.some(w => w.type === type)) return;
    
    const config = WIDGET_CONFIGS[type];
    const newWidget: DashboardWidget = {
      id: type,
      type,
      size: config.defaultSize,
      order: widgets.length,
    };
    saveWidgets([...widgets, newWidget]);
  }, [widgets, saveWidgets]);

  const removeWidget = useCallback((widgetId: string) => {
    const newWidgets = widgets.filter(w => w.id !== widgetId);
    const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));
    saveWidgets(reordered);
  }, [widgets, saveWidgets]);

  const resetLayout = useCallback(() => {
    saveWidgets(DEFAULT_WIDGETS);
  }, [saveWidgets]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, []);

  const availableWidgets = Object.keys(WIDGET_CONFIGS).filter(
    key => !widgets.some(w => w.type === key)
  ) as WidgetType[];

  return {
    widgets,
    isEditMode,
    availableWidgets,
    reorderWidgets,
    changeWidgetSize,
    addWidget,
    removeWidget,
    resetLayout,
    toggleEditMode,
  };
}
