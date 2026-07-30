import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import '../styles/layout.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, hasPermission, permissionsLoaded, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState('OrganicsProject');

  // Esperar a que los permisos estén cargados antes de determinar si es admin
  const isAdmin = permissionsLoaded ? hasPermission('dashboard_admin_read') : false;

  useEffect(() => {
    const fetchLogoConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Primero intentar obtener el logo de la empresa del usuario
        if (token && user?.UserEmpresaID) {
          const empresaResponse = await fetch(`/api/empresas/${user.UserEmpresaID}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (empresaResponse.ok) {
            const empresaData = await empresaResponse.json();
            if (empresaData.EmpresaLogo) {
              setPlatformLogo(empresaData.EmpresaLogo);
              setPlatformName(empresaData.EmpresaNombre || 'OrganicsProject');
              return; // Ya tenemos el logo de la empresa
            }
          }
        }
        
        // Si no hay logo de empresa, usar el logo de la plataforma
        const response = await fetch('/api/parametros-generales', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.PGImagenPlataforma) {
            setPlatformLogo(data.PGImagenPlataforma);
          }
          if (data.PGNombrePlataforma) {
            setPlatformName(data.PGNombrePlataforma);
          }
        }
      } catch (err) {
        console.log('No se pudieron cargar los parámetros de plataforma');
      }
    };
    fetchLogoConfig();
  }, [user?.UserEmpresaID]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Mostrar loading si los permisos aún no están cargados
  if (!permissionsLoaded && token) {
    return (
      <div className="layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading">Cargando permisos...</div>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
          {platformLogo ? (
            <img src={platformLogo} alt={platformName} style={{ maxHeight: '150px', marginBottom: '0px' }} />
          ) : (
            <h2>{platformName}</h2>
          )}
        </div>
        <nav className="sidebar-nav">
          {isAdmin ? (
            // Menú para administrador
            <>
              <Link
                to="/admin"
                className={`nav-item ${isActive('/admin') ? 'active' : ''}`}
              >
                Resumen
              </Link>
              {hasPermission('planillas_read') && (
                <Link
                  to="/planillas"
                  className={`nav-item ${isActive('/planillas') ? 'active' : ''}`}
                >
                  Planillas
                </Link>
              )}
              {hasPermission('planillas_pv_ver') && (
                <Link
                  to="/planillas-pv"
                  className={`nav-item ${isActive('/planillas-pv') ? 'active' : ''}`}
                >
                  Mis Planillas
                </Link>
              )}
              {hasPermission('analitica_read') && (
                <Link
                  to="/analitica"
                  className={`nav-item ${isActive('/analitica') ? 'active' : ''}`}
                >
                  Analítica
                </Link>
              )}
              {hasPermission('config_update') && (
                <Link
                  to="/config"
                  className={`nav-item ${isActive('/config') ? 'active' : ''}`}
                >
                  Configuración
                </Link>
              )}
            </>
          ) : (
            // Menú para usuario normal
            <>
              <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
                Inicio
              </Link>
              {hasPermission('planillas_read') && (
                <Link
                  to="/planillas"
                  className={`nav-item ${isActive('/planillas') ? 'active' : ''}`}
                >
                  Planillas
                </Link>
              )}
              {hasPermission('planillas_pv_ver') && (
                <Link
                  to="/planillas-pv"
                  className={`nav-item ${isActive('/planillas-pv') ? 'active' : ''}`}
                >
                  Mis Planillas
                </Link>
              )}
              {hasPermission('analitica_read') && (
                <Link
                  to="/analitica"
                  className={`nav-item ${isActive('/analitica') ? 'active' : ''}`}
                >
                  Analítica
                </Link>
              )}
              {hasPermission('config_update') && (
                <Link
                  to="/config"
                  className={`nav-item ${isActive('/config') ? 'active' : ''}`}
                >
                  Configuración
                </Link>
              )}
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user?.fullName || user?.email}</span>
            <small>{user?.roles?.join(', ')}</small>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Cerrar Sesión
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
