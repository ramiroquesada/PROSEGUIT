export type LicenseStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';

export function resolveLicenseStatus(fechaExpiracion: string | null | undefined): LicenseStatus {
  if (!fechaExpiracion) return 'VIGENTE';
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
};

export const LICENSE_STATUS_COLOR: Record<LicenseStatus, string> = {
  VIGENTE: 'var(--color-success)',
  POR_VENCER: 'var(--color-warning)',
  VENCIDA: 'var(--color-danger)',
};
