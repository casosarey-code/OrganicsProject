import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { planillasApi } from '../api';
import { Planilla } from '../types';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener el empresaId del usuario desde la API
        const token = localStorage.getItem('token');
        console.log('Token:', token);
        let empresaId = null;
        
        if (token) {
          try {
            const userResponse = await fetch('/api/usuarios/me', {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log('User response:', userResponse.status);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              console.log('User data:', userData);
              empresaId = userData.UserEmpresaID;
            }
          } catch (e) {
            console.error('Error getting user info:', e);
          }
        }
        
        const params: any = {};
        
        // Si tiene empresa asignada, filtrar por esa empresa
        if (empresaId) {
          params.puntoVenta = empresaId;
        }
        // Solo mostrar planillas pendientes (estado A)
        params.estado = 'A';
        console.log('Params:', params);
        
        const data = await planillasApi.getAll(params);
        console.log('Planillas:', data);
        setPlanillas(data);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleVerPlanilla = (id: number) => {
    navigate(`/planillas/${id}/editar`);
  };

  if (isLoading) {
    return <div className="loading">Cargando...</div>;
  }

  const tienePendientes = planillas.length > 0;
  const nombreUsuario = user?.fullName || user?.email || 'Usuario';

  return (
    <div className="page-container">
      {/* Saludo */}
      <div className="dashboard-saludo">
        <h1>
          Hola <span className="nombre-usuario">{nombreUsuario}</span>, bienvenido.
        </h1>
        <div className="saludo-divisor"></div>
      </div>

      {/* Cuadro de estado */}
      <div className={`dashboard-status ${tienePendientes ? 'status-pending' : 'status-ok'}`}>
        <div className="status-icon">
          {tienePendientes ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="bulb-on">
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="bulb-off">
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
            </svg>
          )}
        </div>
        <div className="status-text">
          {tienePendientes ? (
            <p>
              Tienes <strong>{planillas.length}</strong> Planillas pendientes.
              <br />
              <span className="status-subtext">Da clic en las planillas pendientes para completarlos</span>
            </p>
          ) : (
            <p>
              Estas al dia con tus planillas.
              <br />
              <span className="status-subtext">Gracias por tu compromiso!</span>
            </p>
          )}
        </div>
      </div>

      {/* Grid de planillas - solo mostrar si hay datos */}
      {planillas.length > 0 && (
        <div className="dashboard-grid">
          <div className="grid-header">
            <h2>Mis Planillas</h2>
          </div>
          
          <div className="planillas-list">
            {planillas.map((planilla) => (
              <div key={planilla.PlanillaID} className="planilla-card">
                <div className="planilla-info">
                  <span className="planilla-nombre">
                    {planilla.puntoVenta?.EmpresaNombre || `Planilla #${planilla.PlanillaID}`}
                  </span>
                  <span className="planilla-fecha">
                    {new Date(planilla.PlanillaFecha).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => handleVerPlanilla(planilla.PlanillaID)}
                  className="btn btn-sm btn-primary"
                >
                  Ver planilla
                </button>
              </div>
            ))}
          </div>
      </div>
      )}
    </div>
  );
}
