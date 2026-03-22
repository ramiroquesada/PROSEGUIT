export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalEquipos: number;
  activos: number;
  enReparacion: number;
  dadosDeBaja: number;
  enDeposito: number;
  prestamosActivos: number;
  totalUbicaciones: number;
}
