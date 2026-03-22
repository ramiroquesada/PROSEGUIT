import { useDashboardStats, useRecentActivity } from '../hooks/useDashboard';
import styles from './DashboardPage.module.css';

const ACTION_LABELS: Record<string, string> = {
  CREACION: 'Creación',
  EDICION: 'Edición',
  TRANSFERENCIA: 'Transferencia',
  ENVIO_SOPORTE: 'Envío a Soporte',
  RETORNO_SOPORTE: 'Retorno de Soporte',
  ENVIO_SERVICIO_EXTERNO: 'Envío a Servicio',
  RETORNO_SERVICIO_EXTERNO: 'Retorno de Servicio',
  BAJA: 'Baja',
  PRESTAMO: 'Préstamo',
  DEVOLUCION: 'Devolución',
  CAMBIO_ESTADO: 'Cambio de Estado',
};

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: activity, isLoading: loadingActivity } = useRecentActivity(15);

  return (
    <div className={styles.dashboard}>
      <div className={styles.welcome}>
        <h2>Bienvenido a PROSEGUIT</h2>
        <p>Sistema de Gestión de Inventario IT — Intendencia de Soriano</p>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Equipos Activos" value={stats?.activos} loading={loadingStats} color="success" />
        <StatCard label="En Reparación" value={stats?.enReparacion} loading={loadingStats} color="warning" />
        <StatCard label="Préstamos Activos" value={stats?.prestamosActivos} loading={loadingStats} color="info" />
        <StatCard label="Ubicaciones" value={stats?.totalUbicaciones} loading={loadingStats} color="neutral" />
      </div>

      <div className={styles.activitySection}>
        <h3 className={styles.sectionTitle}>Actividad Reciente</h3>
        {loadingActivity ? (
          <p className={styles.loadingText}>Cargando...</p>
        ) : activity && activity.length > 0 ? (
          <div className={styles.activityList}>
            {activity.map((item) => (
              <div key={item.id} className={styles.activityItem}>
                <div className={styles.activityInfo}>
                  <span className={styles.activityAction}>
                    {ACTION_LABELS[item.accion] || item.accion}
                  </span>
                  {item.equipo && (
                    <span className={styles.activityEquipo}>
                      Serie {item.equipo.serie}
                      {item.equipo.modelo ? ` — ${item.equipo.modelo}` : ''}
                    </span>
                  )}
                  <span className={styles.activityMotivo}>{item.motivo}</span>
                </div>
                <div className={styles.activityMeta}>
                  <span>{item.usuario.nombre}</span>
                  <span>{new Date(item.fecha).toLocaleDateString('es-UY')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>No hay actividad reciente</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, loading, color }: {
  label: string;
  value: number | undefined;
  loading: boolean;
  color: string;
}) {
  return (
    <div className={styles.statCard} data-color={color}>
      <span className={styles.statValue}>{loading ? '—' : (value ?? 0)}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
