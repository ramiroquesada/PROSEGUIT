import { NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Monitor,
  MapPin,
  ArrowLeftRight,
  ScrollText,
  LayoutTemplate,
  Users,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import styles from './Sidebar.module.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/equipos', label: 'Equipos', icon: Monitor },
  { to: '/ubicaciones', label: 'Ubicaciones', icon: MapPin },
  { to: '/prestamos', label: 'Préstamos', icon: ArrowLeftRight },
  { to: '/historial', label: 'Historial', icon: ScrollText },
  { to: '/plantillas', label: 'Plantillas', icon: LayoutTemplate },
  { to: '/usuarios', label: 'Usuarios', icon: Users },
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
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>
                <Icon size={18} strokeWidth={1.75} />
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className={styles.userSection}>
        <div className={styles.userCard}>
          <div className={styles.userAvatar}>{initials}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.nombre}</span>
            <span className={styles.userRole}>{user?.rol}</span>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <LogOut size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
