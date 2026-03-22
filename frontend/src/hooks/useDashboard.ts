import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface DashboardStats {
  totalEquipos: number;
  activos: number;
  enReparacion: number;
  dadosDeBaja: number;
  enDeposito: number;
  prestamosActivos: number;
  totalUbicaciones: number;
}

interface RecentActivity {
  id: number;
  accion: string;
  motivo: string;
  fecha: string;
  equipo: { id: number; serie: number; modelo: string | null; tipoEquipo: { nombre: string } } | null;
  usuario: { nombre: string; ficha: number };
  oficinaOrigen: { nombre: string } | null;
  oficinaDestino: { nombre: string } | null;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });
}

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: () => api.get<RecentActivity[]>(`/dashboard/recent-activity?limit=${limit}`),
  });
}

export type { DashboardStats, RecentActivity };
