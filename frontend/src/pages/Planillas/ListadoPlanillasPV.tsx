import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { planillasApi } from '../../api';
import { Planilla } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function ListadoPlanillasPV() {
  const { user } = useAuth();
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ fecha: '', estado: '' });

  const fetchPlanillas = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: any = {};
      if (filters.fecha) params.fecha = filters.fecha;
      if (filters.estado) params.estado = filters.estado;
      // Filtrar por punto de venta del usuario
      if (user?.UserEmpresaID) {
        params.puntoVenta = user.UserEmpresaID;
      }
      const data = await planillasApi.getAll(params);
      setPlanillas(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar planillas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanillas();
  }, [user?.UserEmpresaID]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Mis Planillas</h1>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Fecha:</label>
          <input
            type="date"
            value={filters.fecha}
            onChange={(e) => setFilters({ ...filters, fecha: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label>Estado:</label>
          <select
            value={filters.estado}
            onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="A">Pendiente</option>
            <option value="B">Con alertas</option>
            <option value="C">Por revision</option>
            <option value="D">Revisado</option>
          </select>
        </div>
        <button onClick={fetchPlanillas} className="btn btn-secondary">
          Filtrar
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {isLoading ? (
        <div className="loading">Cargando...</div>
      ) : planillas.length === 0 ? (
        <div className="no-data">No hay planillas registradas</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Punto de Venta</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {planillas.map((planilla) => (
              <tr key={planilla.PlanillaID}>
                <td>{planilla.PlanillaID}</td>
                <td>{new Date(planilla.PlanillaFecha).toLocaleDateString()}</td>
                <td>{planilla.puntoVenta?.EmpresaNombre || '-'}</td>
                <td>
                  <span className={`status status-${planilla.PlanillaEstado === 'A' ? 'a' : planilla.PlanillaEstado === 'B' ? 'b' : planilla.PlanillaEstado === 'C' ? 'c' : 'd'}`}>
                    {planilla.PlanillaEstado === 'A' ? 'Pendiente' : 
                     planilla.PlanillaEstado === 'B' ? 'Con alertas' : 
                     planilla.PlanillaEstado === 'C' ? 'Por revision' : 
                     planilla.PlanillaEstado === 'D' ? 'Revisado' : 'Inactivo'}
                  </span>
                </td>
                <td className="actions-cell">
                  <Link to={`/planillas/${planilla.PlanillaID}/ver-pv`} className="btn btn-sm btn-info">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
