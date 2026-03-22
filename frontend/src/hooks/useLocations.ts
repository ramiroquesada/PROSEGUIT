import { useQuery } from '@tanstack/react-query';
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

export type { LocationTree };
