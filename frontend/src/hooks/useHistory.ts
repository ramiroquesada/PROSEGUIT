import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface HistorialEntry {
  id: number;
  accion: string;
  motivo: string;
  comentario: string | null;
  fecha: string;
  equipo: { id: number; serie: number; modelo: string | null } | null;
  usuario: { id: number; nombre: string; ficha: number };
  oficinaOrigen: { id: number; nombre: string } | null;
  oficinaDestino: { id: number; nombre: string } | null;
}

interface HistoryFilters {
  page?: number;
  limit?: number;
  equipoId?: number;
  accion?: string;
  search?: string;
}

export function useHistory(filters: HistoryFilters = {}) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 25));
  if (filters.equipoId) params.set('equipoId', String(filters.equipoId));
  if (filters.accion) params.set('accion', filters.accion);
  if (filters.search) params.set('search', filters.search);

  return useQuery({
    queryKey: ['history', filters],
    queryFn: () => api.get<{
      data: HistorialEntry[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/history?${params}`),
  });
}

export function useEquipmentHistory(equipoId: number) {
  return useQuery({
    queryKey: ['history', 'equipment', equipoId],
    queryFn: () => api.get<HistorialEntry[]>(`/history/equipment/${equipoId}`),
    enabled: equipoId > 0,
  });
}

export type { HistorialEntry };
