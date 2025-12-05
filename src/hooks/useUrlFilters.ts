import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface FilterState {
  tournamentIds: string[];
  status: string;
  type: string;
  period: '7d' | '30d' | '90d' | 'custom' | 'all';
  startDate: string;
  endDate: string;
}

const DEFAULT_FILTERS: FilterState = {
  tournamentIds: [],
  status: '',
  type: '',
  period: 'all',
  startDate: '',
  endDate: '',
};

export const useUrlFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    const tournamentIds = searchParams.get('tournaments')?.split(',').filter(Boolean) || [];
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const period = (searchParams.get('period') as FilterState['period']) || 'all';
    const startDate = searchParams.get('start') || '';
    const endDate = searchParams.get('end') || '';

    setFilters({
      tournamentIds,
      status,
      type,
      period,
      startDate,
      endDate,
    });
  }, [searchParams]);

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };

    const params = new URLSearchParams();

    if (updatedFilters.tournamentIds.length > 0) {
      params.set('tournaments', updatedFilters.tournamentIds.join(','));
    }
    if (updatedFilters.status) {
      params.set('status', updatedFilters.status);
    }
    if (updatedFilters.type) {
      params.set('type', updatedFilters.type);
    }
    if (updatedFilters.period !== 'all') {
      params.set('period', updatedFilters.period);
    }
    if (updatedFilters.startDate) {
      params.set('start', updatedFilters.startDate);
    }
    if (updatedFilters.endDate) {
      params.set('end', updatedFilters.endDate);
    }

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.tournamentIds.length > 0) count++;
    if (filters.status) count++;
    if (filters.type) count++;
    if (filters.period !== 'all') count++;
    if (filters.startDate || filters.endDate) count++;
    return count;
  }, [filters]);

  const getShareableUrl = useCallback(() => {
    return window.location.href;
  }, []);

  return {
    filters,
    updateFilters,
    resetFilters,
    getActiveFilterCount,
    getShareableUrl,
  };
};
