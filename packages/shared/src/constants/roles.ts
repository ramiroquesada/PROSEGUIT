export const ROLES = {
  ADMIN: 'ADMIN',
  TECNICO: 'TECNICO',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  TECNICO: 'Técnico',
};
