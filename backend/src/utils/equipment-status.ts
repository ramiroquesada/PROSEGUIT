export type EstadoDerivado = 'ACTIVO' | 'EN_REPARACION' | 'EN_DEPOSITO' | 'DISPONIBLE';

export function estadoPorOficina(tipo: string): EstadoDerivado {
  if (tipo === 'DEPOSITO') return 'EN_DEPOSITO';
  if (tipo === 'MANTENIMIENTO') return 'EN_REPARACION';
  if (tipo === 'STOCK') return 'DISPONIBLE';
  return 'ACTIVO';
}
