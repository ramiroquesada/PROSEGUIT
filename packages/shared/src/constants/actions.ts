// Debe mantenerse en sincronía con el enum AccionTipo de schema.prisma
export const ACTION_TYPES = {
  CREACION: 'CREACION',
  ASIGNACION: 'ASIGNACION',
  EDICION: 'EDICION',
  TRANSFERENCIA: 'TRANSFERENCIA',
  ENVIO_SOPORTE: 'ENVIO_SOPORTE',
  RETORNO_SOPORTE: 'RETORNO_SOPORTE',
  ENVIO_SERVICIO_EXTERNO: 'ENVIO_SERVICIO_EXTERNO',
  RETORNO_SERVICIO_EXTERNO: 'RETORNO_SERVICIO_EXTERNO',
  PRESTAMO: 'PRESTAMO',
  DEVOLUCION: 'DEVOLUCION',
  CAMBIO_ESTADO: 'CAMBIO_ESTADO',
} as const;

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  CREACION: 'Creación',
  ASIGNACION: 'Asignación',
  EDICION: 'Edición',
  TRANSFERENCIA: 'Transferencia',
  ENVIO_SOPORTE: 'Envío a Soporte',
  RETORNO_SOPORTE: 'Retorno de Soporte',
  ENVIO_SERVICIO_EXTERNO: 'Envío a Servicio Externo',
  RETORNO_SERVICIO_EXTERNO: 'Retorno de Servicio',
  PRESTAMO: 'Préstamo',
  DEVOLUCION: 'Devolución',
  CAMBIO_ESTADO: 'Cambio de Estado',
};
