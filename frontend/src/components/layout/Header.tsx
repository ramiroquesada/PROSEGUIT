import { useLocation, useParams } from 'react-router';
import { Menu } from 'lucide-react';
import { useEquipmentDetail } from '../../hooks/useEquipment';
import styles from './Header.module.css';

const PAGE_TITLES: Record<string, string> = {
  '/':            'Dashboard',
  '/equipos':     'Equipos',
  '/ubicaciones': 'Ubicaciones',
  '/prestamos':   'Préstamos',
  '/historial':   'Historial',
  '/plantillas':  'Plantillas',
  '/usuarios':    'Usuarios',
};

// Breadcrumb para rutas de detalle/edición de equipos
function EquipmentBreadcrumb({ id, isEdit }: { id: string; isEdit: boolean }) {
  const { data } = useEquipmentDetail(parseInt(id, 10));
  const label = data ? `Serie ${data.serie}` : '…';
  return (
    <span className={styles.breadcrumb}>
      Equipos
      <span className={styles.breadcrumbSep}>›</span>
      <span className={styles.breadcrumbCurrent}>
        {isEdit ? `${label} · Editar` : label}
      </span>
    </span>
  );
}

function NuevoBreadcrumb({ parent }: { parent: string }) {
  return (
    <span className={styles.breadcrumb}>
      {parent}
      <span className={styles.breadcrumbSep}>›</span>
      <span className={styles.breadcrumbCurrent}>Nuevo</span>
    </span>
  );
}

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { pathname } = useLocation();
  const params = useParams();

  // Determinar título y breadcrumb según la ruta
  let title = 'PROSEGUIT';
  let breadcrumb: React.ReactNode = null;

  if (pathname === '/') {
    title = 'Dashboard';
  } else if (pathname === '/equipos/nuevo') {
    title = 'Equipos';
    breadcrumb = <NuevoBreadcrumb parent="Equipos" />;
  } else if (pathname.match(/^\/equipos\/\d+\/editar$/)) {
    title = 'Equipos';
    breadcrumb = <EquipmentBreadcrumb id={params.id!} isEdit />;
  } else if (pathname.match(/^\/equipos\/\d+$/)) {
    title = 'Equipos';
    breadcrumb = <EquipmentBreadcrumb id={params.id!} isEdit={false} />;
  } else {
    const base = '/' + pathname.split('/')[1];
    title = PAGE_TITLES[base] || 'PROSEGUIT';
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuToggle} aria-label="Abrir menú">
          <Menu size={20} strokeWidth={2} />
        </button>
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>{title}</h2>
          {breadcrumb && breadcrumb}
        </div>
      </div>

    </header>
  );
}
