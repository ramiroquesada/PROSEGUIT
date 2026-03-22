import type { UserRole } from '../constants/roles.js';

export interface User {
  id: number;
  nombre: string;
  ficha: number;
  email: string | null;
  rol: UserRole;
  activo: boolean;
  oficinaId: number | null;
  forcePasswordChange: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  usuario: User;
}
