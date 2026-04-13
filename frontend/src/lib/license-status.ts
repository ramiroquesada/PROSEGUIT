export type LicenseStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | 'PERPETUA' | 'SIN_FECHA';

export function resolveLicenseStatus(
  fechaExpiracion: string | null | undefined,
  sinExpiracion: boolean,
): LicenseStatus {
  if (sinExpiracion) return 'PERPETUA';
  if (!fechaExpiracion) return 'SIN_FECHA';

  const exp = new Date(fechaExpiracion);
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (exp < now) return 'VENCIDA';
  if (exp <= in30) return 'POR_VENCER';
  return 'VIGENTE';
}

export const LICENSE_STATUS_LABEL: Record<LicenseStatus, string> = {
  VIGENTE: 'Vigente',
  POR_VENCER: 'Por vencer',
  VENCIDA: 'Vencida',
  PERPETUA: 'Perpetua',
  SIN_FECHA: 'Sin fecha',
};

export const LICENSE_STATUS_COLOR: Record<LicenseStatus, string> = {
  VIGENTE: 'var(--color-success)',
  POR_VENCER: 'var(--color-warning)',
  VENCIDA: 'var(--color-danger)',
  PERPETUA: 'var(--color-info)',
  SIN_FECHA: 'var(--color-text-secondary)',
};
