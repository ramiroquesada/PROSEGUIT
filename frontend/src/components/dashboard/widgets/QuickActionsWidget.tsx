import { useNavigate } from 'react-router';
import { PlusCircle, ArrowLeftRight, Wrench } from 'lucide-react';
import widgetStyles from './Widget.module.css';

export default function QuickActionsWidget() {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Nuevo equipo',
      description: 'Registrar equipo nuevo',
      icon: <PlusCircle size={18} strokeWidth={1.75} />,
      onClick: () => navigate('/equipos/nuevo'),
      color: 'success' as const,
    },
    {
      label: 'Registrar préstamo',
      description: 'Prestar equipo a funcionario',
      icon: <ArrowLeftRight size={18} strokeWidth={1.75} />,
      onClick: () => navigate('/prestamos'),
      color: 'info' as const,
    },
    {
      label: 'Ver reparaciones',
      description: 'Equipos en soporte actualmente',
      icon: <Wrench size={18} strokeWidth={1.75} />,
      onClick: () => navigate('/equipos?estado=EN_REPARACION'),
      color: 'warning' as const,
    },
  ];

  return (
    <div className={widgetStyles.widget}>
      <div className={widgetStyles.widgetHeader}>
        <h3 className={widgetStyles.widgetTitle}>Acciones Rápidas</h3>
      </div>
      <div className={widgetStyles.widgetBody}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-md) var(--space-lg)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast), border-color var(--transition-fast)',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-strong)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
              }}
            >
              <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>{action.icon}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                  {action.label}
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  {action.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
