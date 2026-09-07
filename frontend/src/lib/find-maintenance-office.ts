import type { LocationTree } from '../hooks/useLocations';

export interface MaintenanceOffice {
  ciudadId: number;
  seccionId: number;
  oficinaId: number;
  fullPath: string;
}

export function findMaintenanceOffice(locations: LocationTree[]): MaintenanceOffice | null {
  for (const ciudad of locations) {
    for (const seccion of ciudad.secciones) {
      const oficina = seccion.oficinas.find((item) => item.tipo === 'MANTENIMIENTO');
      if (oficina) {
        return {
          ciudadId: ciudad.id,
          seccionId: seccion.id,
          oficinaId: oficina.id,
          fullPath: `${ciudad.nombre} › ${seccion.nombre} › ${oficina.nombre}`,
        };
      }
    }
  }
  return null;
}
