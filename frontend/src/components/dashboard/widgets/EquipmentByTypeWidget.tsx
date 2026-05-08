import { useNavigate } from 'react-router';
import { useEquipmentByType } from '../../../hooks/useDashboard';
import TypeBadge from '../../../components/ui/TypeBadge';
import widgetStyles from './Widget.module.css';

export default function EquipmentByTypeWidget() {
  const navigate = useNavigate();
  const { data: tipos, isLoading } = useEquipmentByType();

  const maxCount = tipos && tipos.length > 0 ? tipos[0].count : 1;

  return (
    <div className={widgetStyles.widget}>
      <div className={widgetStyles.widgetHeader}>
        <h3 className={widgetStyles.widgetTitle}>Por tipo de equipo</h3>
        <button className={widgetStyles.widgetLink} onClick={() => navigate('/equipos')}>
          Ver inventario →
        </button>
      </div>
      <div className={widgetStyles.widgetBody}>
        {isLoading ? (
          <p className={widgetStyles.loadingText}>Cargando...</p>
        ) : !tipos || tipos.length === 0 ? (
          <p className={widgetStyles.emptyText}>Sin datos</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {tipos.map((tipo) => (
              <div key={tipo.tipoNombre} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <TypeBadge label={tipo.tipoNombre} />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {tipo.count}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--color-bg)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(tipo.count / maxCount) * 100}%`,
                    background: 'var(--color-primary)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
