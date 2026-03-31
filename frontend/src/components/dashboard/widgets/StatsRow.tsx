import { useNavigate } from 'react-router';
import {
  CheckCircle2, Wrench, Package, Sparkles,
  ArrowLeftRight, MapPin,
} from 'lucide-react';
import type { DashboardStats } from '../../../hooks/useDashboard';
import styles from './StatsRow.module.css';

interface StatsRowProps {
  stats: DashboardStats | undefined;
  loading: boolean;
}

export default function StatsRow({ stats, loading }: StatsRowProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.statsGrid}>
      <StatCard
        label="Equipos Activos"
        value={stats?.activos}
        loading={loading}
        color="success"
        icon={<CheckCircle2 size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/equipos?estado=ACTIVO')}
      />
      <StatCard
        label="En Reparación"
        value={stats?.enReparacion}
        loading={loading}
        color="warning"
        icon={<Wrench size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/equipos?estado=EN_REPARACION')}
      />
      <StatCard
        label="En Depósito"
        value={stats?.enDeposito}
        loading={loading}
        color="neutral"
        icon={<Package size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/equipos?estado=EN_DEPOSITO')}
      />
      <StatCard
        label="Nuevos"
        value={stats?.equiposNuevos}
        loading={loading}
        color="indigo"
        icon={<Sparkles size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/equipos?estado=NUEVO')}
      />
      <StatCard
        label="Préstamos Activos"
        value={stats?.prestamosActivos}
        loading={loading}
        color="info"
        icon={<ArrowLeftRight size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/prestamos')}
      />
      <StatCard
        label="Ubicaciones"
        value={stats?.totalUbicaciones}
        loading={loading}
        color="purple"
        icon={<MapPin size={20} strokeWidth={1.75} />}
        onClick={() => navigate('/ubicaciones')}
      />
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
