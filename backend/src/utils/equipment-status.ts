export function estadoPorOficina(nombreOficina: string): 'ACTIVO' | 'EN_REPARACION' | 'EN_DEPOSITO' {
  const n = nombreOficina.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('deposito')) return 'EN_DEPOSITO';
  if (n.includes('soporte')) return 'EN_REPARACION';
  return 'ACTIVO';
}
