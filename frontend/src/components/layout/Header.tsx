import { useLocation } from 'react-router';
import styles from './Header.module.css';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/equipos': 'Equipos',
  '/ubicaciones': 'Ubicaciones',
  '/prestamos': 'Préstamos',
  '/plantillas': 'Plantillas de Modelos',
  '/usuarios': 'Usuarios',
};

export default function Header() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'PROSEGUIT';

  return (
    <header className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
    </header>
  );
}
