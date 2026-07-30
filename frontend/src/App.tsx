import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import DashboardAdmin from './pages/DashboardAdmin';
import ListadoPlanillas from './pages/Planillas/ListadoPlanillas';
import FormularioPlanilla from './pages/Planillas/FormularioPlanilla';
import CompletarPlanilla from './pages/Planillas/CompletarPlanilla';
import VerPlanilla from './pages/Planillas/VerPlanilla';
import VerPlanillaPV from './pages/Planillas/VerPlanillaPV';
import ListadoPlanillasPV from './pages/Planillas/ListadoPlanillasPV';
import Empresas from './pages/Configuracion/Empresas';
import Productos from './pages/Configuracion/Productos';
import Usuarios from './pages/Configuracion/Usuarios';
import Configuracion from './pages/Configuracion/Configuracion';
import EmpresaProductos from './pages/Configuracion/EmpresaProductos';
import Roles from './pages/Configuracion/Roles';
import GestionarPermisos from './pages/Configuracion/GestionarPermisos';
import ConfiguracionGeneral from './pages/Configuracion/ConfiguracionGeneral';
import ConfiguracionEmail from './pages/Configuracion/ConfiguracionEmail';
import PlantillasEmail from './pages/Configuracion/PlantillasEmail';
import HistorialCorreos from './pages/Configuracion/HistorialCorreos';
import ImportarProductos from './pages/Configuracion/ImportarProductos';
import ImportarEmpresaProductos from './pages/Configuracion/ImportarEmpresaProductos';
import GestionComposiciones from './pages/Configuracion/GestionComposiciones';
import Analitica from './pages/Analitica';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

// Componente para redirigir según el tipo de usuario
function HomeRedirect() {
  const { hasPermission, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si es admin, ir a /admin, si no, mostrar Dashboard
  if (hasPermission('dashboard_admin_read')) {
    return <Navigate to="/admin" replace />;
  }

  return <Dashboard />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <DashboardAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planillas"
        element={
          <ProtectedRoute>
            <ListadoPlanillas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planillas-pv"
        element={
          <ProtectedRoute>
            <ListadoPlanillasPV />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planillas/nueva"
        element={
          <ProtectedRoute>
            <FormularioPlanilla />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planillas/:id/editar"
        element={
          <ProtectedRoute>
            <CompletarPlanilla />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planillas/:id/ver"
        element={
          <ProtectedRoute>
            <VerPlanilla />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planillas/:id/ver-pv"
        element={
          <ProtectedRoute>
            <VerPlanillaPV />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analitica"
        element={
          <ProtectedRoute>
            <Analitica />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config"
        element={
          <ProtectedRoute>
            <Configuracion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/empresas"
        element={
          <ProtectedRoute>
            <Empresas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/productos"
        element={
          <ProtectedRoute>
            <Productos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/usuarios"
        element={
          <ProtectedRoute>
            <Usuarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/empresas/:id/productos"
        element={
          <ProtectedRoute>
            <EmpresaProductos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/roles"
        element={
          <ProtectedRoute>
            <Roles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/permisos"
        element={
          <ProtectedRoute>
            <GestionarPermisos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/general"
        element={
          <ProtectedRoute>
            <ConfiguracionGeneral />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/email"
        element={
          <ProtectedRoute>
            <ConfiguracionEmail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/plantillas-email"
        element={
          <ProtectedRoute>
            <PlantillasEmail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/historial-correos"
        element={
          <ProtectedRoute>
            <HistorialCorreos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/importar-productos"
        element={
          <ProtectedRoute>
            <ImportarProductos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/importar-empresa-productos"
        element={
          <ProtectedRoute>
            <ImportarEmpresaProductos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/config/composiciones"
        element={
          <ProtectedRoute>
            <GestionComposiciones />
          </ProtectedRoute>
        }
      />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
