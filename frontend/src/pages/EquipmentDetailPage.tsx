import { useParams, useNavigate } from 'react-router';
import { useEquipmentDetail } from '../hooks/useEquipment';
import { useEquipmentHistory } from '../hooks/useHistory';
import styles from './EquipmentDetailPage.module.css';

const STATUS_LABEL: Record<string, string> = {
  ACTIVO: 'Activo',
  EN_REPARACION: 'En Reparación',
  DADO_DE_BAJA: 'Dado de Baja',
  EN_DEPOSITO: 'En Depósito',
  PRESTADO: 'Prestado',
  EN_SERVICIO_EXTERNO: 'En Servicio Externo',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVO: 'success',
  EN_REPARACION: 'warning',
  DADO_DE_BAJA: 'danger',
  EN_DEPOSITO: 'info',
  PRESTADO: 'warning',
  EN_SERVICIO_EXTERNO: 'info',
};

const ACCION_LABEL: Record<string, string> = {
  CREACION: 'Creación',
  EDICION: 'Edición',
  TRANSFERENCIA: 'Transferencia',
  ENVIO_SOPORTE: 'Envío a Soporte',
  RETORNO_SOPORTE: 'Retorno de Soporte',
  ENVIO_SERVICIO_EXTERNO: 'Envío a Servicio Externo',
  RETORNO_SERVICIO_EXTERNO: 'Retorno de Servicio',
  BAJA: 'Baja',
  PRESTAMO: 'Préstamo',
  DEVOLUCION: 'Devolución',
  CAMBIO_ESTADO: 'Cambio de Estado',
};

const ACCION_COLOR: Record<string, string> = {
  CREACION: 'success',
  EDICION: 'info',
  TRANSFERENCIA: 'primary',
  ENVIO_SOPORTE: 'warning',
  RETORNO_SOPORTE: 'success',
  ENVIO_SERVICIO_EXTERNO: 'warning',
  RETORNO_SERVICIO_EXTERNO: 'success',
  BAJA: 'danger',
  PRESTAMO: 'info',
  DEVOLUCION: 'success',
  CAMBIO_ESTADO: 'neutral',
};

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const equipoId = Number(id);

  const { data: equipo, isLoading } = useEquipmentDetail(equipoId);
  const { data: historial, isLoading: loadingHistory } = useEquipmentHistory(equipoId);

  if (isLoading) {
    return <div className={styles.loading}>Cargando equipo...</div>;
  }

  if (!equipo) {
    return (
      <div className={styles.notFound}>
        <h2>Equipo no encontrado</h2>
        <button onClick={() => navigate('/equipos')} className={styles.backBtn}>
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/equipos')}>
          ← Volver
        </button>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>
            Serie {equipo.serie}
            {equipo.modelo && <span className={styles.modelo}> — {equipo.modelo}</span>}
          </h2>
          <span className={styles.badge} data-color={STATUS_COLOR[equipo.estado] || 'neutral'}>
            {STATUS_LABEL[equipo.estado] || equipo.estado}
          </span>
        </div>
        <button className={styles.editBtn} onClick={() => navigate(`/equipos/${id}/editar`)}>
          Editar
        </button>
      </div>

      <div className={styles.content}>
        {/* Ficha del equipo */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Información del Equipo</h3>
          <dl className={styles.details}>
            <div className={styles.detailRow}>
              <dt>Tipo</dt>
              <dd>{equipo.tipoEquipo.nombre}</dd>
            </div>
            {equipo.template && (
              <div className={styles.detailRow}>
                <dt>Modelo</dt>
                <dd>{equipo.template.nombre}</dd>
              </div>
            )}
            <div className={styles.detailRow}>
              <dt>Ubicación</dt>
              <dd>
                {equipo.oficina.seccion.ciudad.nombre} › {equipo.oficina.seccion.nombre} › {equipo.oficina.nombre}
              </dd>
            </div>
            {equipo.ip && (
              <div className={styles.detailRow}>
                <dt>Dirección IP</dt>
                <dd className={styles.mono}>{equipo.ip}</dd>
              </div>
            )}
            {equipo.observacion && (
              <div className={styles.detailRow}>
                <dt>Observación</dt>
                <dd>{equipo.observacion}</dd>
              </div>
            )}
            <div className={styles.detailRow}>
              <dt>Registrado</dt>
              <dd>{new Date(equipo.createdAt).toLocaleDateString('es-UY')}</dd>
            </div>
          </dl>
        </div>

        {/* Timeline de historial */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            Historial
            {historial && <span className={styles.count}>{historial.length} registros</span>}
          </h3>

          {loadingHistory ? (
            <p className={styles.loadingText}>Cargando historial...</p>
          ) : historial && historial.length > 0 ? (
            <div className={styles.timeline}>
              {historial.map((entry, index) => (
                <div key={entry.id} className={styles.timelineItem} data-last={index === historial.length - 1}>
                  <div className={styles.timelineDot} data-color={ACCION_COLOR[entry.accion] || 'neutral'} />
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineAccion} data-color={ACCION_COLOR[entry.accion] || 'neutral'}>
                        {ACCION_LABEL[entry.accion] || entry.accion}
                      </span>
                      <span className={styles.timelineFecha}>
                        {new Date(entry.fecha).toLocaleDateString('es-UY', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className={styles.timelineMotivo}>{entry.motivo}</p>
                    {(entry.oficinaOrigen || entry.oficinaDestino) && (
                      <p className={styles.timelineUbicacion}>
                        {entry.oficinaOrigen && <span>De: {entry.oficinaOrigen.nombre}</span>}
                        {entry.oficinaOrigen && entry.oficinaDestino && <span> → </span>}
                        {entry.oficinaDestino && <span>A: {entry.oficinaDestino.nombre}</span>}
                      </p>
                    )}
                    <p className={styles.timelineTecnico}>por {entry.usuario.nombre}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>Sin historial registrado</p>
          )}
        </div>
      </div>
    </div>
  );
}
