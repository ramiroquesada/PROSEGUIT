import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { resolveLicenseStatus, type LicenseStatus } from '../lib/license-status';

interface Licencia {
  id: number;
  software: string;
  version: string | null;
  clave: string | null;
  tipo: string | null;
  proveedor: string | null;
  precioCompra: string | null;
  fechaCompra: string | null;
  fechaExpiracion: string | null;
  sinExpiracion: boolean;
  observacion: string | null;
  equipoId: number | null;
  equipo: {
    id: number;
    serie: number;
    modelo: string | null;
    tipoEquipo: { nombre: string };
  } | null;
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
  perpetuas: number;
  sinFecha: number;
}

interface LicenseFilters {
  page?: number;
  limit?: number;
  software?: string;
  estado?: LicenseStatus;
  equipoId?: number;
  sinEquipo?: boolean;
  search?: string;
}

export function useLicenses(filters: LicenseFilters = {}) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 25));
  if (filters.software) params.set('software', filters.software);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.equipoId) params.set('equipoId', String(filters.equipoId));
  if (filters.sinEquipo) params.set('sinEquipo', 'true');
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
        estado: resolveLicenseStatus(lic.fechaExpiracion, lic.sinExpiracion),
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
      clave?: string;
      tipo?: string;
      proveedor?: string;
      precioCompra?: number;
      fechaCompra?: string;
      fechaExpiracion?: string;
      sinExpiracion?: boolean;
      observacion?: string;
      equipoId?: number;
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
        version?: string | null;
        clave?: string | null;
        tipo?: string | null;
        proveedor?: string | null;
        precioCompra?: number | null;
        fechaCompra?: string | null;
        fechaExpiracion?: string | null;
        sinExpiracion?: boolean;
        observacion?: string | null;
        equipoId?: number | null;
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
