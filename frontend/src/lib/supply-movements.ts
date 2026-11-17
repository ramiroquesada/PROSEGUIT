import type { TipoMovimiento } from '../hooks/useSupplies';

export const MOVIMIENTO_LABEL: Record<TipoMovimiento, string> = {
  INGRESO: 'Ingreso',
  ENTREGA: 'Entrega',
  AJUSTE: 'Ajuste',
};

export const MOVIMIENTO_TONE: Record<TipoMovimiento, string> = {
  INGRESO: 'success',
  ENTREGA: 'info',
  AJUSTE: 'warning',
};

export const MOVIMIENTO_OPTIONS = (Object.keys(MOVIMIENTO_LABEL) as TipoMovimiento[])
  .map((value) => ({ value, label: MOVIMIENTO_LABEL[value] }));

/** "unidad" → "unidades", "pila" → "pilas". Unidades cortas (m, kg) no se pluralizan. */
export function pluralUnidad(n: number, unidad: string) {
  if (Math.abs(n) === 1 || unidad.length <= 2 || /s$/i.test(unidad)) return unidad;
  return /[aeiouáéíóú]$/i.test(unidad) ? `${unidad}s` : `${unidad}es`;
}

/** "3 unidades", "1 pila", "12 m". */
export function formatCantidad(n: number, unidad: string) {
  return `${n} ${pluralUnidad(n, unidad)}`;
}

export function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
