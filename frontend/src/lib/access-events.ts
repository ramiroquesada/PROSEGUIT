export const EVENTO_ACCESO_LABEL: Record<string, string> = {
  LOGIN_OK: 'Inicio de sesión',
  LOGIN_FALLIDO: 'Contraseña incorrecta',
  USUARIO_INEXISTENTE: 'Ficha inexistente',
  USUARIO_INACTIVO: 'Usuario inactivo',
  USUARIO_BLOQUEADO: 'Bloqueado por intentos',
  LOGOUT: 'Cierre de sesión',
  CAMBIO_PASSWORD: 'Cambio de contraseña',
  RESET_PASSWORD: 'Reset de contraseña',
  SESIONES_CERRADAS: 'Sesiones cerradas',
};

export const EVENTO_ACCESO_COLOR: Record<string, string> = {
  LOGIN_OK: 'success',
  LOGIN_FALLIDO: 'danger',
  USUARIO_INEXISTENTE: 'danger',
  USUARIO_INACTIVO: 'warning',
  USUARIO_BLOQUEADO: 'danger',
  LOGOUT: 'neutral',
  CAMBIO_PASSWORD: 'info',
  RESET_PASSWORD: 'warning',
  SESIONES_CERRADAS: 'warning',
};

export const EVENTOS_FALLIDOS = new Set(['LOGIN_FALLIDO', 'USUARIO_INEXISTENTE', 'USUARIO_INACTIVO', 'USUARIO_BLOQUEADO']);

export const EVENTO_ACCESO_OPTIONS = [
  { value: '', label: 'Todos los eventos' },
  ...Object.entries(EVENTO_ACCESO_LABEL).map(([value, label]) => ({ value, label })),
];

// Resumen legible del user-agent: "Chrome · Windows"
export function describeUserAgent(ua: string | null): string {
  if (!ua) return '—';
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\/|Opera/.test(ua) ? 'Opera' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) ? 'Safari' : 'Otro';
  const os =
    /Windows/.test(ua) ? 'Windows' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} · ${os}` : browser;
}
