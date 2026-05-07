export function urgencyColor(dias: number): string {
  if (dias > 30) return 'var(--color-danger)';
  if (dias >= 14) return 'var(--color-warning)';
  return 'var(--color-success)';
}
