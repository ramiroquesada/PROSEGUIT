import { useLocation } from 'react-router';
import styles from './Header.module.css';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/equipos': 'Equipos',
  '/ubicaciones': 'Ubicaciones',
  '/prestamos': 'Préstamos',
  '/historial': 'Historial Global',
  '/plantillas': 'Plantillas de Modelos',
  '/usuarios': 'Usuarios',
};

export default function Header() {
  const { pathname } = useLocation();
  const baseRoute = '/' + pathname.split('/')[1];
  const title = pageTitles[baseRoute] || 'PROSEGUIT';

  return (
    <header className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.statusBadge}>
        <span className={styles.statusDot} />
        Sistema operativo
      </div>
    </header>
  );
}
