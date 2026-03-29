export const ACCION_LABEL: Record<string, string> = {
  CREACION: 'Creación',
  ASIGNACION: 'Asignación',
  EDICION: 'Edición',
  TRANSFERENCIA: 'Transferencia',
  ENVIO_SOPORTE: 'Envío a Soporte',
  RETORNO_SOPORTE: 'Retorno de Soporte',
  ENVIO_SERVICIO_EXTERNO: 'Envío a Servicio',
  RETORNO_SERVICIO_EXTERNO: 'Retorno de Servicio',
  PRESTAMO: 'Préstamo',
  DEVOLUCION: 'Devolución',
  CAMBIO_ESTADO: 'Cambio de Estado',
};

export const ACCION_COLOR: Record<string, string> = {
  CREACION: 'success',
  EDICION: 'info',
  ASIGNACION: 'primary',
  TRANSFERENCIA: 'primary',
  ENVIO_SOPORTE: 'warning',
  RETORNO_SOPORTE: 'success',
  ENVIO_SERVICIO_EXTERNO: 'warning',
  RETORNO_SERVICIO_EXTERNO: 'success',
  PRESTAMO: 'info',
  DEVOLUCION: 'success',
  CAMBIO_ESTADO: 'neutral',
};

export const ACCION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'CREACION', label: 'Creación' },
  { value: 'ASIGNACION', label: 'Asignación' },
  { value: 'EDICION', label: 'Edición' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'ENVIO_SOPORTE', label: 'Envío a Soporte' },
  { value: 'RETORNO_SOPORTE', label: 'Retorno de Soporte' },
  { value: 'ENVIO_SERVICIO_EXTERNO', label: 'Envío a Servicio Externo' },
  { value: 'RETORNO_SERVICIO_EXTERNO', label: 'Retorno de Servicio' },
  { value: 'PRESTAMO', label: 'Préstamo' },
  { value: 'DEVOLUCION', label: 'Devolución' },
  { value: 'CAMBIO_ESTADO', label: 'Cambio de Estado' },
];
