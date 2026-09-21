import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface UsuarioRef { id: number; nombre: string; ficha: number }

interface RegistroAcceso {
  id: number;
  fecha: string;
  evento: string;
  ficha: number | null;
  usuario: UsuarioRef | null;
  actor: UsuarioRef | null;
  ip: string | null;
  userAgent: string | null;
}

interface AccessLogFilters {
  page?: number;
  limit?: number;
  evento?: string;
  ficha?: string;
  desde?: string;
  hasta?: string;
}

export function useAccessLog(filters: AccessLogFilters = {}) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 30));
  if (filters.evento) params.set('evento', filters.evento);
  if (filters.ficha) params.set('ficha', filters.ficha);
  if (filters.desde) params.set('desde', filters.desde);
  if (filters.hasta) params.set('hasta', filters.hasta);

  return useQuery({
    queryKey: ['access-log', filters],
    queryFn: () => api.get<{
      data: RegistroAcceso[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/access-log?${params}`),
    staleTime: 30_000,
  });
}

export function useAccessSummary() {
  return useQuery({
    queryKey: ['access-log', 'summary'],
    queryFn: () => api.get<{ loginsOk: number; fallidos: number; bloqueos: number }>('/access-log/summary'),
    staleTime: 30_000,
  });
}

export type { RegistroAcceso };
