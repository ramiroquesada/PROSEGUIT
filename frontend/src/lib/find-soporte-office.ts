import type { LocationTree } from '../hooks/useLocations';

export interface SoporteOffice {
  ciudadId: number;
  seccionId: number;
  oficinaId: number;
  fullPath: string;
}

export function findSoporteOffice(locations: LocationTree[]): SoporteOffice | null {
  for (const ciudad of locations) {
    for (const seccion of ciudad.secciones) {
      const oficina = seccion.oficinas.find((o) =>
        o.nombre.toLowerCase().includes('soporte')
      );
      if (oficina) {
        return {
          ciudadId: ciudad.id,
          seccionId: seccion.id,
          oficinaId: oficina.id,
          fullPath: `${ciudad.nombre} \u203a ${seccion.nombre} \u203a ${oficina.nombre}`,
        };
      }
    }
  }
  return null;
}
