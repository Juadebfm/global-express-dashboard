import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Lead, LeadStatus, LeadType, LeadsListResult } from '@/types';
import { listLeads, updateLead, deleteLead, getMyD2dLeads, submitD2dIntake, submitShopInquiry } from '@/services';
import { STALE_TIME } from '@/lib/queryDefaults';
import { useAuthToken } from './useAuthToken';

const TOKEN_KEY = 'globalxpress_token';

export interface LeadsFilters {
  leadType?: LeadType;
  status?: LeadStatus;
}

export function useLeads(page = 1, limit = 50, filters: LeadsFilters = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY) ?? '';
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', 'list', page, limit, filters.leadType, filters.status],
    queryFn: (): Promise<LeadsListResult> =>
      listLeads(token, { page, limit, ...filters }),
    enabled: !!token,
    staleTime: STALE_TIME.REAL_TIME,
  });
  return {
    leads: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error: error instanceof Error ? error.message : error ? 'Failed to load leads' : null,
  };
}

export function useUpdateLead() {
  const token = sessionStorage.getItem(TOKEN_KEY) ?? '';
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const update = useCallback(
    async (id: string, patch: { status?: LeadStatus; assignedTo?: string | null; message?: string }) => {
      setIsUpdating(true);
      setUpdateError(null);
      try {
        const updated = await updateLead(id, patch, token);
        await queryClient.invalidateQueries({ queryKey: ['leads'] });
        return updated;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update lead';
        setUpdateError(msg);
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [token, queryClient],
  );

  return { update, isUpdating, updateError };
}

export function useDeleteLead() {
  const token = sessionStorage.getItem(TOKEN_KEY) ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLead(id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useMyD2dLeads() {
  const getToken = useAuthToken();
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', 'my-d2d'],
    queryFn: async (): Promise<Lead[]> => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getMyD2dLeads(token);
    },
    staleTime: STALE_TIME.REAL_TIME,
  });
  return {
    leads: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : error ? 'Failed to load your requests' : null,
  };
}

export function useSubmitD2dIntake() {
  const getToken = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Parameters<typeof submitD2dIntake>[0]) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return submitD2dIntake(payload, token);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads', 'my-d2d'] }),
  });
}

export function useSubmitShopInquiry() {
  const getToken = useAuthToken();
  return useMutation({
    mutationFn: async (payload: Parameters<typeof submitShopInquiry>[0]) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return submitShopInquiry(payload, token);
    },
  });
}
