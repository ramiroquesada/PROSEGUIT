import { Routes, Route, Navigate, useLocation } from 'react-router';
import { use, lazy, Suspense } from 'react';
import { AuthContext } from './lib/auth-context';
import MainLayout from './components/layout/MainLayout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EquipmentListPage = lazy(() => import('./pages/EquipmentListPage'));
const EquipmentDetailPage = lazy(() => import('./pages/EquipmentDetailPage'));
const EquipmentFormPage = lazy(() => import('./pages/EquipmentFormPage'));
const LoansPage = lazy(() => import('./pages/LoansPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const LocationsPage = lazy(() => import('./pages/LocationsPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--color-text-secondary)' }}>
    Cargando...
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = use(AuthContext)!;
  const { pathname } = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.forcePasswordChange && pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />;
  }
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = use(AuthContext)!;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={<GuestRoute><LoginPage /></GuestRoute>}
        />
        <Route
          path="/cambiar-password"
          element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>}
        />
        <Route
          path="/*"
          element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
        >
          <Route index element={<DashboardPage />} />
          <Route path="equipos" element={<EquipmentListPage />} />
          <Route path="equipos/nuevo" element={<EquipmentFormPage />} />
          <Route path="equipos/:id" element={<EquipmentDetailPage />} />
          <Route path="equipos/:id/editar" element={<EquipmentFormPage />} />
          <Route path="prestamos" element={<LoansPage />} />
          <Route path="ubicaciones" element={<LocationsPage />} />
          <Route path="historial" element={<HistoryPage />} />
          <Route path="plantillas" element={<TemplatesPage />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
