/**
 * Resuelve el estado real de un equipo a partir del nombre de la oficina.
 * El estado en DB puede estar desactualizado (ej: migración desde v1 puso todo ACTIVO).
 * La fuente de verdad es la ubicación:
 *   - Oficinas con "deposito" en el nombre → EN_DEPOSITO
 *   - Oficinas con "soporte" en el nombre  → EN_REPARACION
 *
 * Estados que se leen directamente de DB (no se derivan de la ubicación):
 *   - NUEVO: equipo recién ingresado, aún sin destino final asignado
 *   - PRESTADO: gestionado por el módulo de préstamos
 *   - EN_SERVICIO_EXTERNO: gestionado por el módulo de servicios externos
 *
 * Flujo NUEVO → ACTIVO:
 *   El equipo se crea con estado NUEVO y queda en la oficina de soporte.
 *   Al realizar una transferencia a cualquier oficina que NO sea soporte/depósito,
 *   el backend cambia automáticamente el estado a ACTIVO.
 */

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function resolveEstado(estadoDB: string, oficinaNombre: string): string {
  // NUEVO, PRESTADO y EN_SERVICIO_EXTERNO se leen directo de DB
  if (estadoDB === 'NUEVO' || estadoDB === 'PRESTADO' || estadoDB === 'EN_SERVICIO_EXTERNO') return estadoDB;

  const n = norm(oficinaNombre);
  if (n.includes('deposito')) return 'EN_DEPOSITO';
  if (n.includes('soporte')) return 'EN_REPARACION';
  return 'ACTIVO';
}

export const STATUS_LABEL: Record<string, string> = {
  NUEVO: 'Nuevo',
  ACTIVO: 'Activo',
  EN_REPARACION: 'En Reparación',
  DADO_DE_BAJA: 'Dado de Baja',
  EN_DEPOSITO: 'En Depósito',
  PRESTADO: 'Prestado',
  EN_SERVICIO_EXTERNO: 'En Servicio Externo',
};

export const STATUS_COLOR: Record<string, string> = {
  NUEVO: 'new',
  ACTIVO: 'success',
  EN_REPARACION: 'warning',
  DADO_DE_BAJA: 'danger',
  EN_DEPOSITO: 'neutral',
  PRESTADO: 'info',
  EN_SERVICIO_EXTERNO: 'info',
};
