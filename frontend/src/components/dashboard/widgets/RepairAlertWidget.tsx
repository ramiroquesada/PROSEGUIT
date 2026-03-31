import { useNavigate } from 'react-router';
import { useRepairAlerts } from '../../../hooks/useDashboard';
import widgetStyles from './Widget.module.css';

function urgencyColor(dias: number): string {
  if (dias > 30) return 'var(--color-danger)';
  if (dias >= 14) return 'var(--color-warning)';
  return 'var(--color-success)';
}

export default function RepairAlertWidget() {
  const navigate = useNavigate();
  const { data: equipos, isLoading } = useRepairAlerts(5);

  return (
    <div className={widgetStyles.widget}>
      <div className={widgetStyles.widgetHeader}>
        <h3 className={widgetStyles.widgetTitle}>Equipos en reparación</h3>
        <button className={widgetStyles.widgetLink} onClick={() => navigate('/equipos?estado=EN_REPARACION')}>
          Ver todos →
        </button>
      </div>
      <div className={widgetStyles.widgetBody}>
        {isLoading ? (
          <p className={widgetStyles.loadingText}>Cargando...</p>
        ) : !equipos || equipos.length === 0 ? (
          <p className={widgetStyles.emptyText}>No hay equipos en reparación</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {equipos.map((eq) => (
              <div
                key={eq.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-sm) 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                    Serie {eq.serie}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {eq.tipoEquipo.nombre}{eq.modelo ? ` — ${eq.modelo}` : ''}
                  </span>
                </div>
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: urgencyColor(eq.diasEnReparacion),
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {eq.diasEnReparacion === 0 ? 'Hoy' : `${eq.diasEnReparacion}d`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
