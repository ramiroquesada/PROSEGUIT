export function estadoPorOficina(tipo: string): 'ACTIVO' | 'EN_REPARACION' | 'EN_DEPOSITO' {
  if (tipo === 'DEPOSITO') return 'EN_DEPOSITO';
  if (tipo === 'SOPORTE') return 'EN_REPARACION';
  return 'ACTIVO';
}
