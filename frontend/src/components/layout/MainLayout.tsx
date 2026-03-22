import { Outlet } from 'react-router';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './MainLayout.module.css';

export default function MainLayout() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
