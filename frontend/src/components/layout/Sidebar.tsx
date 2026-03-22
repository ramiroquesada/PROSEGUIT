import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth-context';
import styles from './Sidebar.module.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/equipos', label: 'Equipos', icon: '💻' },
  { to: '/ubicaciones', label: 'Ubicaciones', icon: '📍' },
  { to: '/prestamos', label: 'Préstamos', icon: '🔄' },
  { to: '/plantillas', label: 'Plantillas', icon: '📋' },
  { to: '/usuarios', label: 'Usuarios', icon: '👥' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <h1 className={styles.logo}>PROSEGUIT</h1>
        <span className={styles.version}>v2.0</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.userSection}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.nombre}</span>
          <span className={styles.userRole}>{user?.rol}</span>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Salir
        </button>
      </div>
    </aside>
  );
}
