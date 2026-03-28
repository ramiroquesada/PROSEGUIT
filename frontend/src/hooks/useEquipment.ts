import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface EquipmentFilters {
  page?: number;
  limit?: number;
  tipoEquipoId?: number;
  estado?: string;
  ciudadId?: number;
  seccionId?: number;
  oficinaId?: number;
  search?: string;
  sortBy?: 'serie' | 'modelo' | 'tipo';
  sortDir?: 'asc' | 'desc';
}

export function useEquipmentList(filters: EquipmentFilters = {}) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 25));

  if (filters.tipoEquipoId) params.set('tipoEquipoId', String(filters.tipoEquipoId));
  if (filters.estado)       params.set('estado', filters.estado);
  if (filters.ciudadId)     params.set('ciudadId', String(filters.ciudadId));
  if (filters.seccionId)    params.set('seccionId', String(filters.seccionId));
  if (filters.oficinaId)    params.set('oficinaId', String(filters.oficinaId));
  if (filters.search)       params.set('search', filters.search);
  if (filters.sortBy)       params.set('sortBy', filters.sortBy);
  if (filters.sortDir)      params.set('sortDir', filters.sortDir);

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

export function useTransferEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; oficinaDestinoId: number; motivo: string; comentario?: string }) =>
      api.post(`/equipment/${id}/transfer`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['equipment', id] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
      qc.invalidateQueries({ queryKey: ['history', 'equipment', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSendToSupport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; motivo: string; comentario?: string; oficinaDestinoId?: number }) =>
      api.post(`/equipment/${id}/send-to-support`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['equipment', id] });
      qc.invalidateQueries({ queryKey: ['history', 'equipment', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSendToService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; servicioId: number; motivo: string; comentario?: string }) =>
      api.post(`/equipment/${id}/send-to-service`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['equipment', id] });
      qc.invalidateQueries({ queryKey: ['history', 'equipment', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReturnFromService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; motivo: string; diagnostico?: string; comentario?: string }) =>
      api.post(`/equipment/${id}/return-from-service`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['equipment', id] });
      qc.invalidateQueries({ queryKey: ['history', 'equipment', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDecommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; motivo: string; comentario?: string }) =>
      api.post(`/equipment/${id}/decommission`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['equipment', id] });
      qc.invalidateQueries({ queryKey: ['history', 'equipment', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useNextSerie() {
  return useQuery({
    queryKey: ['equipment', 'next-serie'],
    queryFn: () => api.get<{ nextSerie: number }>('/equipment/next-serie'),
    staleTime: 0, // siempre refetch al abrir el formulario
  });
}

export type { Equipment };
