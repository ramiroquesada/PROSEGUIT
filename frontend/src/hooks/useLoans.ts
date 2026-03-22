import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface Prestamo {
  id: number;
  equipoId: number;
  activo: boolean;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
  motivo: string | null;
  equipo: {
    id: number;
    serie: number;
    modelo: string | null;
    tipoEquipo: { nombre: string };
  };
  oficinaDestino: { id: number; nombre: string };
  solicitante: { ficha: number; nombre: string } | null;
  tecnico: { id: number; nombre: string; ficha: number };
  devueltoPor: { ficha: number; nombre: string } | null;
  recibidoPor: { id: number; nombre: string } | null;
}

interface LoanFilters {
  page?: number;
  limit?: number;
  activo?: boolean;
  equipoId?: number;
  search?: string;
}

export function useLoans(filters: LoanFilters = {}) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 25));
  if (filters.activo !== undefined) params.set('activo', String(filters.activo));
  if (filters.equipoId) params.set('equipoId', String(filters.equipoId));
  if (filters.search) params.set('search', filters.search);

  return useQuery({
    queryKey: ['loans', filters],
    queryFn: () => api.get<{
      data: Prestamo[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/loans?${params}`),
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      equipoId: number;
      oficinaDestinoId: number;
      solicitanteFicha: number;
      motivo?: string;
    }) => api.post<Prestamo>('/loans', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReturnLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, devueltoPorFicha }: { id: number; devueltoPorFicha: number }) =>
      api.post<Prestamo>(`/loans/${id}/return`, { devueltoPorFicha }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['equipment'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export type { Prestamo };
