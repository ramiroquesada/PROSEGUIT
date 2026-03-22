import { Routes, Route, Navigate } from 'react-router';
import { use } from 'react';
import { AuthContext } from './lib/auth-context';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EquipmentListPage from './pages/EquipmentListPage';
import EquipmentDetailPage from './pages/EquipmentDetailPage';
import EquipmentFormPage from './pages/EquipmentFormPage';
import LoansPage from './pages/LoansPage';
import UsersPage from './pages/UsersPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import LocationsPage from './pages/LocationsPage';
import TemplatesPage from './pages/TemplatesPage';
import HistoryPage from './pages/HistoryPage';
import MainLayout from './components/layout/MainLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = use(AuthContext)!;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Redirigir a cambio de contraseña si es obligatorio
  if (user?.forcePasswordChange && window.location.pathname !== '/cambiar-password') {
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
  );
}
