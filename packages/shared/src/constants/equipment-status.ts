export const EQUIPMENT_STATUS = {
  ACTIVO: 'ACTIVO',
  EN_REPARACION: 'EN_REPARACION',
  DADO_DE_BAJA: 'DADO_DE_BAJA',
  EN_DEPOSITO: 'EN_DEPOSITO',
  PRESTADO: 'PRESTADO',
  EN_SERVICIO_EXTERNO: 'EN_SERVICIO_EXTERNO',
} as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUS)[keyof typeof EQUIPMENT_STATUS];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVO: 'Activo',
  EN_REPARACION: 'En Reparación',
  DADO_DE_BAJA: 'Dado de Baja',
  EN_DEPOSITO: 'En Depósito',
  PRESTADO: 'Prestado',
  EN_SERVICIO_EXTERNO: 'En Servicio Externo',
};

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  ACTIVO: 'success',
  EN_REPARACION: 'warning',
  DADO_DE_BAJA: 'danger',
  EN_DEPOSITO: 'info',
  PRESTADO: 'warning',
  EN_SERVICIO_EXTERNO: 'info',
};
