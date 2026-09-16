import { useNavigate } from 'react-router';
import { useLoansAlerts } from '../../../hooks/useDashboard';
import { urgencyColor } from '../../../lib/dashboard-helpers';
import TypeBadge from '../../../components/ui/TypeBadge';
import widgetStyles from './Widget.module.css';

export default function LoansAlertWidget() {
  const navigate = useNavigate();
  const { data: loans, isLoading } = useLoansAlerts(5);

  return (
    <div className={widgetStyles.widget}>
      <div className={widgetStyles.widgetHeader}>
        <h3 className={widgetStyles.widgetTitle}>Préstamos sin devolver</h3>
        <button className={widgetStyles.widgetLink} onClick={() => navigate('/prestamos')}>
          Ver todos →
        </button>
      </div>
      <div className={widgetStyles.widgetBody}>
        {isLoading ? (
          <p className={widgetStyles.loadingText}>Cargando...</p>
        ) : !loans || loans.length === 0 ? (
          <p className={widgetStyles.emptyText}>No hay préstamos activos</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {loans.map((loan) => (
              <div
                key={loan.id}
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
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {loan.funcionario.nombre}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Serie {loan.equipo.serie} —</span>
                    <TypeBadge label={loan.equipo.tipoEquipo.nombre} />
                  </div>
                </div>
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: urgencyColor(loan.diasTranscurridos),
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {loan.diasTranscurridos === 0 ? 'Hoy' : `${loan.diasTranscurridos}d`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
