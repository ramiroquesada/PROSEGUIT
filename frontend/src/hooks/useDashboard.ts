import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface DashboardStats {
  totalEquipos: number;
  activos: number;
  enReparacion: number;
  enDeposito: number;
  enServicioExterno: number;
  equiposNuevos: number;
  prestamosActivos: number;
  totalUbicaciones: number;
}

export interface RecentActivity {
  id: number;
  accion: string;
  motivo: string;
  fecha: string;
  equipo: { id: number; serie: number; modelo: string | null; tipoEquipo: { nombre: string } } | null;
  usuario: { nombre: string; ficha: number };
  oficinaOrigen: { nombre: string } | null;
  oficinaDestino: { nombre: string } | null;
}

export interface LoanAlert {
  id: number;
  fechaPrestamo: string;
  diasTranscurridos: number;
  equipo: { serie: number; modelo: string | null; tipoEquipo: { nombre: string } };
  funcionario: { nombre: string };
}

export interface RepairAlert {
  id: number;
  serie: number;
  modelo: string | null;
  tipoEquipo: { nombre: string };
  diasEnReparacion: number;
  fechaIngreso: string;
}

export interface EquipmentByType {
  tipoNombre: string;
  count: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
    staleTime: 30_000,
  });
}

export function useRecentActivity(limit = 20, accion?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (accion) params.set('accion', accion);
  return useQuery({
    queryKey: ['dashboard', 'recent-activity', limit, accion ?? null],
    queryFn: () => api.get<RecentActivity[]>(`/dashboard/recent-activity?${params}`),
    staleTime: 30_000,
  });
}

export function useLoansAlerts(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'loans-alerts', limit],
    queryFn: () => api.get<LoanAlert[]>(`/dashboard/loans-alerts?limit=${limit}`),
    staleTime: 30_000,
  });
}

export function useRepairAlerts(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'repair-alerts', limit],
    queryFn: () => api.get<RepairAlert[]>(`/dashboard/repair-alerts?limit=${limit}`),
    staleTime: 30_000,
  });
}

export function useEquipmentByType() {
  return useQuery({
    queryKey: ['dashboard', 'equipment-by-type'],
    queryFn: () => api.get<EquipmentByType[]>('/dashboard/equipment-by-type'),
    staleTime: 60_000,
  });
}
