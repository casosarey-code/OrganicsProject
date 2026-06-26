import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import './Dashboard.css';

interface DashboardStats {
  pendientes: number;
  completadas: number;
  totalVentas: number;
  totalCostos: number;
  totalGanancias: number;
}

interface CarruselImagen {
  imagen: string;
  titulo: string;
}

export default function DashboardAdmin() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    pendientes: 0,
    completadas: 0,
    totalVentas: 0,
    totalCostos: 0,
    totalGanancias: 0
  });
  const [imagenes, setImagenes] = useState<CarruselImagen[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Verificar permiso
  useEffect(() => {
    if (!hasPermission('dashboard_admin_read')) {
      setAccessDenied(true);
      setIsLoading(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    fetchDashboardData();
    fetchParametros();
  }, []);

  useEffect(() => {
    // Auto-rotate carousel every 5 seconds
    if (imagenes.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % imagenes.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [imagenes.length]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      let empresaId = null;
      
      if (token) {
        try {
          const userResponse = await fetch('/api/usuarios/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            empresaId = userData.UserEmpresaID;
          }
        } catch (e) {
          console.error('Error getting user info:', e);
        }
      }

      // Fetch planillas stats
      const params: any = {};
      if (empresaId) {
        params.puntoVenta = empresaId;
      }

      // Planillas pendientes (estado A)
      const pendientesRes = await api.get('/planillas', { params: { ...params, estado: 'A' } });
      const pendientes = Array.isArray(pendientesRes.data) ? pendientesRes.data.length : 0;

      // Planillas completadas (estado C o D)
      const completadasRes = await api.get('/planillas', { params: { ...params, estado: 'C' } });
      const completadasC = Array.isArray(completadasRes.data) ? completadasRes.data.length : 0;
      const revisadasRes = await api.get('/planillas', { params: { ...params, estado: 'D' } });
      const completadasD = Array.isArray(revisadasRes.data) ? revisadasRes.data.length : 0;

      // Fetch analytics for totals
      const hoy = new Date();
      const analiticaRes = await api.get('/analitica', {
        params: {
          year: hoy.getFullYear(),
          puntoVentaId: empresaId || undefined
        }
      });

      setStats({
        pendientes,
        completadas: completadasC + completadasD,
        totalVentas: analiticaRes.data?.totales?.ventas || 0,
        totalCostos: analiticaRes.data?.totales?.costos || 0,
        totalGanancias: analiticaRes.data?.totales?.ganancias || 0
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParametros = async () => {
    try {
      const response = await api.get('/parametros-generales');
      const pgImagenes = response.data?.PGImagenesCarrusel || [];
      
      if (Array.isArray(pgImagenes) && pgImagenes.length > 0) {
        setImagenes(pgImagenes);
      } else {
        // Default images if none configured
        setImagenes([
          { imagen: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200', titulo: 'Bienvenido al Sistema' },
          { imagen: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200', titulo: 'Gestión de Planillas' },
          { imagen: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200', titulo: 'Reportes y Analytics' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching parametros:', error);
      // Fallback images
      setImagenes([
        { imagen: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200', titulo: 'Bienvenido al Sistema' }
      ]);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString();

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % imagenes.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + imagenes.length) % imagenes.length);
  };

if (isLoading) {
    return <div className="loading">Cargando...</div>;
  }

  if (accessDenied) {
    return (
      <div className="page-container">
        <div className="access-denied">
          <h2>Acceso Denegado</h2>
          <p>No tienes permiso para ver el Dashboard de Administración.</p>
          <p>Contacta al administrador del sistema si crees que esto es un error.</p>
          <Link to="/" className="btn btn-primary">Volver al Inicio</Link>
        </div>
      </div>
    );
  }

  const nombreUsuario = user?.fullName || user?.email || 'Administrador';

  return (
    <div className="page-container">
      {/* Saludo */}
      <div className="dashboard-saludo">
        <h1>
          Hola <span className="nombre-usuario">{nombreUsuario}</span>, bienvenido al panel de administración.
        </h1>
        <div className="saludo-divisor"></div>
      </div>

      {/* Dashboard Cards - Indicadores de métricas */}
      <div className="dashboard-cards">
        <div className="card card-primary">
          <div className="card-header">Total Ventas</div>
          <div className="card-value">$ {formatNumber(stats.totalVentas)}</div>
        </div>
        <div className="card card-danger">
          <div className="card-header">Total Costos</div>
          <div className="card-value">$ {formatNumber(stats.totalCostos)}</div>
        </div>
        <div className="card card-success">
          <div className="card-header">Total Ganancias</div>
          <div className="card-value">$ {formatNumber(stats.totalGanancias)}</div>
        </div>
      </div>

      {/* Mensaje de estado */}
      <div className={`dashboard-status ${stats.pendientes > 0 ? 'status-pending' : 'status-ok'}`}>
        <div className="status-icon">
          {stats.pendientes > 0 ? (
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
          {stats.pendientes > 0 ? (
            <p>
              Tienes <strong>{stats.pendientes}</strong> Planillas pendientes.
              <br />
              <span className="status-subtext">Da clic en las planillas para completarlas</span>
            </p>
          ) : (
            <p>
              Estas al día con tus planillas.
              <br />
              <span className="status-subtext">¡Gracias por tu compromiso!</span>
            </p>
          )}
        </div>
      </div>

      {/* Carrusel de Imágenes */}
      {imagenes.length > 0 && (
        <div className="carrusel-container">
          <div className="carrusel-header">
            <h3>Información Destacada</h3>
            <Link to="/configuracion/general" className="btn btn-sm btn-secondary">
              Configurar Imágenes
            </Link>
          </div>
          
          <div className="carrusel">
            <div className="carrusel-inner" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {imagenes.map((img, index) => (
                <div key={index} className="carrusel-slide">
                  <img src={img.imagen} alt={img.titulo} />
                  {img.titulo && (
                    <div className="carrusel-caption">
                      <h4>{img.titulo}</h4>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {imagenes.length > 1 && (
              <>
                <button className="carrusel-btn carrusel-btn-prev" onClick={prevSlide}>
                  ❮
                </button>
                <button className="carrusel-btn carrusel-btn-next" onClick={nextSlide}>
                  ❯
                </button>
                
                <div className="carrusel-dots">
                  {imagenes.map((_, index) => (
                    <button
                      key={index}
                      className={`carrusel-dot ${index === currentSlide ? 'active' : ''}`}
                      onClick={() => setCurrentSlide(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
