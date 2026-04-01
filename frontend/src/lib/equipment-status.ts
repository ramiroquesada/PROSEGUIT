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
  EN_DEPOSITO: 'En Depósito',
  PRESTADO: 'Prestado',
  EN_SERVICIO_EXTERNO: 'En Servicio Externo',
};

export const STATUS_COLOR: Record<string, string> = {
  NUEVO: 'new',
  ACTIVO: 'success',
  EN_REPARACION: 'warning',
  EN_DEPOSITO: 'neutral',
  PRESTADO: 'info',
  EN_SERVICIO_EXTERNO: 'info',
};

export type WarrantyStatus = 'expired' | 'expiring-soon' | 'valid' | null;

/**
 * Retorna el estado de garantía basado en la fecha de fin.
 * - 'expired': la fecha ya pasó
 * - 'expiring-soon': vence en 30 días o menos
 * - 'valid': vence en más de 30 días
 * - null: sin fecha de garantía
 */
export function getWarrantyStatus(fechaFinGarantia: string | null): WarrantyStatus {
  if (!fechaFinGarantia) return null;
  const now = new Date();
  const end = new Date(fechaFinGarantia);
  if (end < now) return 'expired';
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return 'expiring-soon';
  return 'valid';
}

/**
 * Retorna los días restantes de garantía (negativo si ya venció).
 */
export function getWarrantyDaysLeft(fechaFinGarantia: string | null): number | null {
  if (!fechaFinGarantia) return null;
  const now = new Date();
  const end = new Date(fechaFinGarantia);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
