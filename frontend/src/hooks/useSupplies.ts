import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export type TipoMovimiento = 'INGRESO' | 'ENTREGA' | 'AJUSTE';

export interface CategoriaInsumo {
  id: number;
  nombre: string;
  _count: { insumos: number };
}

export interface Insumo {
  id: number;
  nombre: string;
  unidad: string;
  stock: number;
  activo: boolean;
  observacion: string | null;
  categoria: { id: number; nombre: string };
  /** Último movimiento (sólo en el listado). */
  movimientos?: { fecha: string; tipo: TipoMovimiento }[];
}

export interface MovimientoInsumo {
  id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  stockResultante: number;
  recibe: string | null;
  motivo: string | null;
  fecha: string;
  usuario: { id: number; nombre: string; ficha: number };
  oficina: { id: number; nombre: string; seccion: { nombre: string } } | null;
  equipo: { id: number; serie: number } | null;
  insumo: { id: number; nombre: string; unidad: string };
}

export interface InsumoDetalle extends Omit<Insumo, 'movimientos'> {
  movimientos: MovimientoInsumo[];
  createdAt: string;
}

export type MovimientoInput =
  | { tipo: 'INGRESO'; cantidad: number; motivo?: string }
  | { tipo: 'ENTREGA'; cantidad: number; oficinaId?: number; equipoSerie?: number; recibe?: string; motivo?: string }
  | { tipo: 'AJUSTE'; stockReal: number; motivo: string };

export interface MovimientosFilters {
  page?: number;
  insumoId?: number;
  categoriaId?: number;
  tipo?: TipoMovimiento | '';
  desde?: string;
  hasta?: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function qs(params: Record<string, string | number | boolean | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== false) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Invalida todo lo que depende del stock de insumos. */
function useInvalidateSupplies() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['supplies'] });
}

export function useSupplyCategories() {
  return useQuery({
    queryKey: ['supplies', 'categories'],
    queryFn: () => api.get<CategoriaInsumo[]>('/supplies/categories'),
    staleTime: 60_000,
  });
}

export function useCreateSupplyCategory() {
  const invalidate = useInvalidateSupplies();
  return useMutation({
    mutationFn: (data: { nombre: string }) => api.post<CategoriaInsumo>('/supplies/categories', data),
    onSuccess: invalidate,
  });
}

export function useUpdateSupplyCategory() {
  const invalidate = useInvalidateSupplies();
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => api.put(`/supplies/categories/${id}`, { nombre }),
    onSuccess: invalidate,
  });
}

export function useSupplies(incluirInactivos = false) {
  return useQuery({
    queryKey: ['supplies', 'list', { incluirInactivos }],
    queryFn: () => api.get<Insumo[]>(`/supplies${qs({ incluirInactivos })}`),
    staleTime: 30_000,
  });
}

export function useSupply(id: number) {
  return useQuery({
    queryKey: ['supplies', 'detail', id],
    queryFn: () => api.get<InsumoDetalle>(`/supplies/${id}`),
    staleTime: 30_000,
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useCreateSupply() {
  const invalidate = useInvalidateSupplies();
  return useMutation({
    mutationFn: (data: { nombre: string; categoriaId: number; unidad?: string; observacion?: string; ingresoInicial?: number }) =>
      api.post<Insumo>('/supplies', data),
    onSuccess: invalidate,
  });
}

export function useUpdateSupply() {
  const invalidate = useInvalidateSupplies();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; nombre?: string; categoriaId?: number; unidad?: string; observacion?: string | null; activo?: boolean }) =>
      api.put<Insumo>(`/supplies/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useSupplyMovement() {
  const invalidate = useInvalidateSupplies();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & MovimientoInput) => api.post(`/supplies/${id}/movements`, data),
    onSuccess: invalidate,
  });
}

export function useSupplyMovements(filters: MovimientosFilters) {
  return useQuery({
    queryKey: ['supplies', 'movements', filters],
    queryFn: () => api.get<Paginated<MovimientoInsumo>>(`/supplies/movements${qs({ ...filters, limit: 30 })}`),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
