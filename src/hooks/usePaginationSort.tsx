import { useState, useCallback } from 'react';

export interface PaginationSortState {
  currentPage: number;
  pageSize: number;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
}

export function usePaginationSort(initialSort: string | null = 'created_at', initialDirection: 'asc' | 'desc' = 'desc') {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [sortColumn, setSortColumn] = useState<string | null>(initialSort);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialDirection);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  }, [sortColumn, sortDirection]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  return {
    currentPage,
    pageSize,
    sortColumn,
    sortDirection,
    handleSort,
    handlePageChange,
    handlePageSizeChange,
  };
}
