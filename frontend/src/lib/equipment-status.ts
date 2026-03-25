/**
 * Resuelve el estado real de un equipo a partir del nombre de la oficina.
 * El estado en DB puede estar desactualizado (ej: migración desde v1 puso todo ACTIVO).
 * La fuente de verdad es la ubicación:
 *   - Oficinas con "deposito" en el nombre → EN_DEPOSITO
 *   - Oficinas con "soporte" en el nombre  → EN_REPARACION
 * PRESTADO y EN_SERVICIO_EXTERNO se mantienen del DB (son gestionados por acciones propias).
 */

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function resolveEstado(estadoDB: string, oficinaNombre: string): string {
  // Estos estados los maneja la lógica de préstamos/servicios externos, no la ubicación
  if (estadoDB === 'PRESTADO' || estadoDB === 'EN_SERVICIO_EXTERNO') return estadoDB;

  const n = norm(oficinaNombre);
  if (n.includes('deposito')) return 'EN_DEPOSITO';
  if (n.includes('soporte')) return 'EN_REPARACION';
  return 'ACTIVO';
}

export const STATUS_LABEL: Record<string, string> = {
  ACTIVO: 'Activo',
  EN_REPARACION: 'En Reparación',
  DADO_DE_BAJA: 'Dado de Baja',
  EN_DEPOSITO: 'En Depósito',
  PRESTADO: 'Prestado',
  EN_SERVICIO_EXTERNO: 'En Servicio Externo',
};

export const STATUS_COLOR: Record<string, string> = {
  ACTIVO: 'success',
  EN_REPARACION: 'warning',
  DADO_DE_BAJA: 'danger',
  EN_DEPOSITO: 'neutral',
  PRESTADO: 'info',
  EN_SERVICIO_EXTERNO: 'info',
};
