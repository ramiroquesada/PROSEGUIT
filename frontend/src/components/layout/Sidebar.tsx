import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth-context';
import styles from './Sidebar.module.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/equipos', label: 'Equipos', icon: '💻' },
  { to: '/ubicaciones', label: 'Ubicaciones', icon: '📍' },
  { to: '/prestamos', label: 'Préstamos', icon: '🔄' },
  { to: '/historial', label: 'Historial', icon: '📜' },
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

  const initials = user?.nombre
    ? user.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logoMark}>🏛</div>
        <div className={styles.logoText}>
          <h1 className={styles.logo}>PROSEGUIT</h1>
          <span className={styles.logoSubtitle}>Inventario IT</span>
        </div>
        <span className={styles.version}>v2</span>
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
        <div className={styles.userCard}>
          <div className={styles.userAvatar}>{initials}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.nombre}</span>
            <span className={styles.userRole}>{user?.rol}</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
            Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
