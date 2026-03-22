import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface EquipmentFilters {
  page?: number;
  limit?: number;
  tipoEquipoId?: number;
  estado?: string;
  oficinaId?: number;
  ciudadId?: number;
  seccionId?: number;
  search?: string;
}

export function useEquipmentList(filters: EquipmentFilters = {}) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 25));

  if (filters.tipoEquipoId) params.set('tipoEquipoId', String(filters.tipoEquipoId));
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.oficinaId) params.set('oficinaId', String(filters.oficinaId));
  if (filters.ciudadId) params.set('ciudadId', String(filters.ciudadId));
  if (filters.seccionId) params.set('seccionId', String(filters.seccionId));
  if (filters.search) params.set('search', filters.search);

  return useQuery({
    queryKey: ['equipment', filters],
    queryFn: () => api.get<{
      data: Equipment[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/equipment?${params}`),
  });
}

export function useEquipmentDetail(id: number) {
  return useQuery({
    queryKey: ['equipment', id],
    queryFn: () => api.get<Equipment>(`/equipment/${id}`),
    enabled: id > 0,
  });
}

export function useEquipmentTypes() {
  return useQuery({
    queryKey: ['equipment-types'],
    queryFn: () => api.get<{ id: number; nombre: string; icono: string | null }[]>('/equipment/types'),
    staleTime: 30 * 60 * 1000,
  });
}

interface Equipment {
  id: number;
  serie: number;
  modelo: string | null;
  estado: string;
  ip: string | null;
  observacion: string | null;
  tipoEquipo: { id: number; nombre: string; icono: string | null };
  oficina: {
    id: number;
    nombre: string;
    seccion: {
      id: number;
      nombre: string;
      ciudad: { id: number; nombre: string };
    };
  };
  template: { id: number; nombre: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type { Equipment };
