export const EQUIPMENT_STATUS = {
  NUEVO: 'NUEVO',
  ACTIVO: 'ACTIVO',
  EN_REPARACION: 'EN_REPARACION',
  EN_DEPOSITO: 'EN_DEPOSITO',
  PRESTADO: 'PRESTADO',
  EN_SERVICIO_EXTERNO: 'EN_SERVICIO_EXTERNO',
} as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUS)[keyof typeof EQUIPMENT_STATUS];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  NUEVO: 'Nuevo',
  ACTIVO: 'Activo',
  EN_REPARACION: 'En Reparación',
  EN_DEPOSITO: 'En Depósito',
  PRESTADO: 'Prestado',
  EN_SERVICIO_EXTERNO: 'En Servicio Externo',
};

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  NUEVO: 'new',
  ACTIVO: 'success',
  EN_REPARACION: 'warning',
  EN_DEPOSITO: 'neutral',
  PRESTADO: 'info',
  EN_SERVICIO_EXTERNO: 'info',
};
