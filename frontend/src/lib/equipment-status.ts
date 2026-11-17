/**
 * Resuelve el estado real de un equipo a partir del TIPO de su oficina actual
 * (misma regla que el backend, `estadoPorOficina`). El estado en DB puede estar
 * desactualizado (ej: migración desde v1 puso todo ACTIVO).
 *   - DEPOSITO      → EN_DEPOSITO   (descarte: irrecuperable / a destruir)
 *   - MANTENIMIENTO → EN_REPARACION (ubicación temporal tras una ENTRADA)
 *   - STOCK         → DISPONIBLE    (sano y listo para usarse)
 *   - OFICINA / SOPORTE → ACTIVO
 *
 * Estados que se leen directamente de DB (no se derivan de la ubicación):
 *   - NUEVO: equipo recién ingresado (se crea en Stock)
 *   - PRESTADO: gestionado por el módulo de préstamos
 *   - EN_SERVICIO_EXTERNO: gestionado por el módulo de servicios externos
 */
export function resolveEstado(estadoDB: string, oficinaTipo: string): string {
  if (estadoDB === 'NUEVO' || estadoDB === 'PRESTADO' || estadoDB === 'EN_SERVICIO_EXTERNO') return estadoDB;

  if (oficinaTipo === 'DEPOSITO') return 'EN_DEPOSITO';
  if (oficinaTipo === 'MANTENIMIENTO') return 'EN_REPARACION';
  if (oficinaTipo === 'STOCK') return 'DISPONIBLE';
  return 'ACTIVO';
}

export const STATUS_LABEL: Record<string, string> = {
  NUEVO: 'Nuevo',
  DISPONIBLE: 'Disponible',
  ACTIVO: 'Activo',
  EN_REPARACION: 'En Mantenimiento',
  EN_DEPOSITO: 'En Depósito',
  PRESTADO: 'Prestado',
  EN_SERVICIO_EXTERNO: 'En Servicio Externo',
};

export const STATUS_COLOR: Record<string, string> = {
  NUEVO: 'new',
  DISPONIBLE: 'new',
  ACTIVO: 'success',
  EN_REPARACION: 'warning',
  EN_DEPOSITO: 'neutral',
  PRESTADO: 'info',
  EN_SERVICIO_EXTERNO: 'info',
};

export const STOCK_ETAPA_LABEL: Record<string, string> = {
  A_REVISAR: 'A revisar',
  LISTO: 'Listo',
};

/** Días completos desde una fecha ISO hasta hoy. */
export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

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
