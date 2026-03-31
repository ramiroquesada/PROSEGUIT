import { useAuth } from '../lib/auth-context';
import { useDashboardStats } from '../hooks/useDashboard';
import StatsRow from '../components/dashboard/widgets/StatsRow';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import styles from './DashboardPage.module.css';
import { usePageTitle } from '../hooks/usePageTitle';

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

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const { data: stats, isLoading: loadingStats } = useDashboardStats();

  const firstName = user?.nombre?.split(' ')[0] ?? '';

  return (
    <div className={styles.dashboard}>
      <div className={styles.welcome}>
        <div>
          <h2>{getGreeting()}, {firstName}</h2>
          <p>{formatDate()}</p>
        </div>
        <span className={styles.totalBadge}>
          {loadingStats ? '—' : stats?.totalEquipos ?? 0} equipos registrados
        </span>
      </div>

      <StatsRow stats={stats} loading={loadingStats} />
      <DashboardGrid />
    </div>
  );
}
