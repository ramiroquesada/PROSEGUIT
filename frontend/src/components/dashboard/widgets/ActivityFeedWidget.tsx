import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useRecentActivity } from '../../../hooks/useDashboard';
import { ACCION_LABEL, ACCION_COLOR, ACCION_OPTIONS } from '../../../lib/action-types';
import TypeBadge from '../../../components/ui/TypeBadge';
import widgetStyles from './Widget.module.css';
import styles from './ActivityFeedWidget.module.css';

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

export default function ActivityFeedWidget() {
  const navigate = useNavigate();
  const [accionFilter, setAccionFilter] = useState<string>('');
  const { data: activity, isLoading } = useRecentActivity(20, accionFilter || undefined);

  return (
    <div className={widgetStyles.widget}>
      <div className={widgetStyles.widgetHeader}>
        <h3 className={widgetStyles.widgetTitle}>Actividad Reciente</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <select
            value={accionFilter}
            onChange={(e) => setAccionFilter(e.target.value)}
            style={{
              fontSize: 'var(--font-size-xs)',
              padding: '3px var(--space-sm)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <option value="">Todas las acciones</option>
            {ACCION_OPTIONS.filter((opt) => opt.value !== '').map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button className={widgetStyles.widgetLink} onClick={() => navigate('/historial')}>
            Ver todo →
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className={widgetStyles.loadingText}>Cargando...</p>
      ) : activity && activity.length > 0 ? (
        <div className={styles.activityList}>
          {activity.map((item) => (
            <div
              key={item.id}
              className={styles.activityItem}
              data-clickable={Boolean(item.equipo)}
              onClick={() => item.equipo && navigate(`/equipos/${item.equipo.id}`)}
            >
              <span
                className={styles.accionBadge}
                data-color={ACCION_COLOR[item.accion] || 'neutral'}
              >
                {ACCION_LABEL[item.accion] || item.accion}
              </span>

              <div className={styles.activityInfo}>
                {item.equipo ? (
                  <span className={styles.activityEquipo}>
                    Serie {item.equipo.serie}
                    {item.equipo.modelo && <span className={styles.activityModelo}> — {item.equipo.modelo}</span>}
                    <TypeBadge label={item.equipo.tipoEquipo.nombre} />
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

              <div className={styles.activityMeta}>
                <span className={styles.activityUser}>{item.usuario.nombre}</span>
                <span className={styles.activityTime}>{formatTime(item.fecha)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={widgetStyles.emptyText}>No hay actividad reciente</p>
      )}
    </div>
  );
}
