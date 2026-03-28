import { useNavigate } from 'react-router';
import {
  CheckCircle2,
  Wrench,
  ArrowLeftRight,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { useDashboardStats, useRecentActivity } from '../hooks/useDashboard';
import styles from './DashboardPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

const ACTION_LABELS: Record<string, string> = {
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

const ACTION_COLOR: Record<string, string> = {
  CREACION: 'success', EDICION: 'info', ASIGNACION: 'primary', TRANSFERENCIA: 'primary',
  ENVIO_SOPORTE: 'warning', RETORNO_SOPORTE: 'success',
  ENVIO_SERVICIO_EXTERNO: 'warning', RETORNO_SERVICIO_EXTERNO: 'success',
  PRESTAMO: 'info', DEVOLUCION: 'success', CAMBIO_ESTADO: 'neutral',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatDate() {
  return new Date().toLocaleDateString('es-UY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: activity, isLoading: loadingActivity } = useRecentActivity(20);

  const firstName = user?.nombre?.split(' ')[0] ?? '';

  return (
    <div className={styles.dashboard}>
      {/* ── Bienvenida ── */}
      <div className={styles.welcome}>
        <div>
          <h2>{getGreeting()}, {firstName}</h2>
          <p>{formatDate()}</p>
        </div>
        <span className={styles.totalBadge}>
          {loadingStats ? '—' : stats?.totalEquipos ?? 0} equipos registrados
        </span>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Equipos Activos"
          value={stats?.activos}
          loading={loadingStats}
          color="success"
          icon={<CheckCircle2 size={20} strokeWidth={1.75} />}
          onClick={() => navigate('/equipos?estado=ACTIVO')}
        />
        <StatCard
          label="En Reparación"
          value={stats?.enReparacion}
          loading={loadingStats}
          color="warning"
          icon={<Wrench size={20} strokeWidth={1.75} />}
          onClick={() => navigate('/equipos?estado=EN_REPARACION')}
        />
        <StatCard
          label="Préstamos Activos"
          value={stats?.prestamosActivos}
          loading={loadingStats}
          color="info"
          icon={<ArrowLeftRight size={20} strokeWidth={1.75} />}
          onClick={() => navigate('/prestamos')}
        />
        <StatCard
          label="Ubicaciones"
          value={stats?.totalUbicaciones}
          loading={loadingStats}
          color="neutral"
          icon={<MapPin size={20} strokeWidth={1.75} />}
          onClick={() => navigate('/ubicaciones')}
        />
      </div>

      {/* ── Actividad reciente ── */}
      <div className={styles.activitySection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Actividad Reciente</h3>
          <button className={styles.sectionLink} onClick={() => navigate('/historial')}>
            Ver todo →
          </button>
        </div>

        {loadingActivity ? (
          <p className={styles.loadingText}>Cargando...</p>
        ) : activity && activity.length > 0 ? (
          <div className={styles.activityList}>
            {activity.map((item) => (
              <div
                key={item.id}
                className={styles.activityItem}
                data-clickable={Boolean(item.equipo)}
                onClick={() => item.equipo && navigate(`/equipos/${item.equipo.id}`)}
              >
                {/* Badge de acción */}
                <span
                  className={styles.accionBadge}
                  data-color={ACTION_COLOR[item.accion] || 'neutral'}
                >
                  {ACTION_LABELS[item.accion] || item.accion}
                </span>

                {/* Info del equipo */}
                <div className={styles.activityInfo}>
                  {item.equipo ? (
                    <span className={styles.activityEquipo}>
                      Serie {item.equipo.serie}
                      {item.equipo.modelo && <span className={styles.activityModelo}> — {item.equipo.modelo}</span>}
                      <span className={styles.activityTipo}>{item.equipo.tipoEquipo.nombre}</span>
                    </span>
                  ) : (
                    <span className={styles.activityEquipo}>—</span>
                  )}
                  <span className={styles.activityMotivo}>{item.motivo}</span>
                  {(item.oficinaOrigen || item.oficinaDestino) && (
                    <span className={styles.activityUbic}>
                      {item.oficinaOrigen && <span>{item.oficinaOrigen.nombre}</span>}
                      {item.oficinaOrigen && item.oficinaDestino && <span className={styles.arrow}>→</span>}
                      {item.oficinaDestino && <span>{item.oficinaDestino.nombre}</span>}
                    </span>
                  )}
                </div>

                {/* Meta: usuario + tiempo */}
                <div className={styles.activityMeta}>
                  <span className={styles.activityUser}>{item.usuario.nombre}</span>
                  <span className={styles.activityTime}>{formatTime(item.fecha)}</span>
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

function StatCard({ label, value, loading, color, icon, onClick }: {
  label: string;
  value: number | undefined;
  loading: boolean;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div className={styles.statCard} data-color={color} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.statHeader}>
        <div className={styles.statIcon}>{icon}</div>
        <span className={styles.statArrow}>→</span>
      </div>
      <div className={styles.statBody}>
        <span className={styles.statValue}>{loading ? '—' : (value ?? 0)}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </div>
  );
}
