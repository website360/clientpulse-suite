import { useState, useMemo } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';

export type DateRangePreset = 'today' | 'week' | 'month' | 'last30' | 'year' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function useDateRangeFilter(initialPreset: DateRangePreset = 'month') {
  const [preset, setPreset] = useState<DateRangePreset>(initialPreset);
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });

  const dateRange = useMemo<DateRange>(() => {
    const today = new Date();
    
    switch (preset) {
      case 'today':
        return {
          startDate: startOfDay(today),
          endDate: endOfDay(today),
        };
      case 'week':
        return {
          startDate: startOfWeek(today, { weekStartsOn: 0 }),
          endDate: endOfWeek(today, { weekStartsOn: 0 }),
        };
      case 'month':
        return {
          startDate: startOfMonth(today),
          endDate: endOfMonth(today),
        };
      case 'last30':
        return {
          startDate: startOfDay(subDays(today, 30)),
          endDate: endOfDay(today),
        };
      case 'year':
        return {
          startDate: startOfYear(today),
          endDate: endOfYear(today),
        };
      case 'custom':
        return customRange;
      default:
        return {
          startDate: startOfMonth(today),
          endDate: endOfMonth(today),
        };
    }
  }, [preset, customRange]);

  return {
    preset,
    setPreset,
    dateRange,
    setCustomRange,
  };
}
