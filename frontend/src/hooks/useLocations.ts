import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface LocationTree {
  id: number;
  nombre: string;
  secciones: {
    id: number;
    nombre: string;
    ciudadId: number;
    oficinas: {
      id: number;
      nombre: string;
      seccionId: number;
    }[];
  }[];
}

export function useLocationTree() {
  return useQuery({
    queryKey: ['locations-tree'],
    queryFn: () => api.get<LocationTree[]>('/locations/tree'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useEquipmentByOficina(oficinaId: number | null) {
  return useQuery({
    queryKey: ['equipment', { oficinaId }],
    queryFn: () => api.get<{
      data: {
        id: number; serie: number; modelo: string | null; estado: string;
        tipoEquipo: { nombre: string }; ip: string | null;
      }[];
      pagination: { total: number };
    }>(`/equipment?oficinaId=${oficinaId}&limit=100`),
    enabled: oficinaId !== null && oficinaId > 0,
  });
}

export function useCreateCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nombre: string) => api.post<{ id: number; nombre: string }>('/locations/cities', { nombre }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations-tree'] }),
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nombre, ciudadId }: { nombre: string; ciudadId: number }) =>
      api.post<{ id: number; nombre: string; ciudadId: number }>('/locations/sections', { nombre, ciudadId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations-tree'] }),
  });
}

export function useCreateOffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nombre, seccionId }: { nombre: string; seccionId: number }) =>
      api.post<{ id: number; nombre: string; seccionId: number }>('/locations/offices', { nombre, seccionId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations-tree'] }),
  });
}

export type { LocationTree };
