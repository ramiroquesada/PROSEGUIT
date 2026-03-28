export const ACTION_TYPES = {
  CREACION: 'CREACION',
  ASIGNACION: 'ASIGNACION',
  EDICION: 'EDICION',
  TRANSFERENCIA: 'TRANSFERENCIA',
  ENVIO_SOPORTE: 'ENVIO_SOPORTE',
  RETORNO_SOPORTE: 'RETORNO_SOPORTE',
  ENVIO_SERVICIO: 'ENVIO_SERVICIO',
  RETORNO_SERVICIO: 'RETORNO_SERVICIO',
  PRESTAMO: 'PRESTAMO',
  DEVOLUCION_PRESTAMO: 'DEVOLUCION_PRESTAMO',
} as const;

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  CREACION: 'Creación',
  ASIGNACION: 'Asignación',
  EDICION: 'Edición',
  TRANSFERENCIA: 'Transferencia',
  ENVIO_SOPORTE: 'Envío a Soporte',
  RETORNO_SOPORTE: 'Retorno de Soporte',
  ENVIO_SERVICIO: 'Envío a Servicio Externo',
  RETORNO_SERVICIO: 'Retorno de Servicio',
  PRESTAMO: 'Préstamo',
  DEVOLUCION_PRESTAMO: 'Devolución de Préstamo',
};
