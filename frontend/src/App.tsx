import { Routes, Route, Navigate } from 'react-router';
import { useAuth } from './lib/auth-context';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EquipmentListPage from './pages/EquipmentListPage';
import MainLayout from './components/layout/MainLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="equipos" element={<EquipmentListPage />} />
      </Route>
    </Routes>
  );
}
