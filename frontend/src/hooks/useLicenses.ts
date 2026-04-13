import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { resolveLicenseStatus, type LicenseStatus } from '../lib/license-status';

interface Licencia {
  id: number;
  software: string;
  version: string | null;
  fechaExpiracion: string | null;
  equipoId: number;
  equipo: {
    id: number;
    serie: number;
    modelo: string | null;
    tipoEquipo: { nombre: string };
  };
  createdAt: string;
  updatedAt: string;
  estado?: LicenseStatus;
}

interface LicenseSummaryItem {
  software: string;
  total: number;
  vigentes: number;
  porVencer: number;
  vencidas: number;
}

interface LicenseFilters {
  page?: number;
  limit?: number;
  software?: string;
  estado?: LicenseStatus;
  equipoId?: number;
  search?: string;
}

export function useLicenses(filters: LicenseFilters = {}) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 25));
  if (filters.software) params.set('software', filters.software);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.equipoId) params.set('equipoId', String(filters.equipoId));
  if (filters.search) params.set('search', filters.search);

  return useQuery({
    queryKey: ['licenses', filters],
    queryFn: async () => {
      const response = await api.get<{
        data: Licencia[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/licenses?${params}`);

      // Agregar estado derivado a cada licencia
      const dataWithStatus = response.data.map((lic) => ({
        ...lic,
        estado: resolveLicenseStatus(lic.fechaExpiracion),
      }));

      return {
        data: dataWithStatus,
        pagination: response.pagination,
      };
    },
    staleTime: 30_000,
  });
}

export function useLicensesSummary() {
  return useQuery({
    queryKey: ['licenses', 'summary'],
    queryFn: () => api.get<LicenseSummaryItem[]>('/licenses/summary'),
    staleTime: 30_000,
  });
}

export function useEquipmentLicenses(equipoId: number) {
  return useLicenses({ equipoId });
}

export function useCreateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      software: string;
      version?: string;
      fechaExpiracion?: string;
      equipoId: number;
    }) => api.post<Licencia>('/licenses', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['licenses'] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useUpdateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        software?: string;
        version?: string;
        fechaExpiracion?: string;
      };
    }) => api.put<Licencia>(`/licenses/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['licenses'] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useDeleteLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/licenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['licenses'] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export type { Licencia, LicenseSummaryItem };
