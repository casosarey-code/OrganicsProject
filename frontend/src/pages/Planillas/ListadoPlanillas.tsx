import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { planillasApi } from '../../api';
import { Planilla } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function ListadoPlanillas() {
  const { user } = useAuth();
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ fecha: '', estado: '' });
  const isAdmin = user?.roles?.some(role => 
    typeof role === 'string' ? role === 'admin' : role.name === 'admin'
  );
  // Detectar si es usuario PV (rol PV que no es admin)
  const isPV = !isAdmin && user?.roles?.some(role => {
    const roleName = typeof role === 'string' ? role : role.name;
    return roleName === 'pv' || roleName === 'Punto de Venta';
  });

  const fetchPlanillas = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: any = {};
      if (filters.fecha) params.fecha = filters.fecha;
      if (filters.estado) params.estado = filters.estado;
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
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta planilla?')) return;
    try {
      await planillasApi.delete(id);
      setPlanillas((prev) => prev.filter((p) => p.PlanillaID !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
              <h1>Listado de Planillas</h1>
              {isAdmin && (
                        <Link to="/planillas/nueva" className="btn btn-primary">
                          + Nueva Planilla
                        </Link>
                      )}
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
            <option value="A">Pendiente</option><option value="B">Con alertas</option><option value="C">Por revision</option><option value="D">Revisado</option>
            <option value="I">Inactivo</option>
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
              <th>Creador</th>
              <th>Productos</th>
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
                <td>{planilla.creador?.fullName || '-'}</td>
                <td>{planilla._count?.detalles || 0}</td>
                <td>
                  <span className={`status status-${planilla.PlanillaEstado === 'A' ? 'a' : planilla.PlanillaEstado === 'B' ? 'b' : planilla.PlanillaEstado === 'C' ? 'c' : 'd'}`}>
                    {planilla.PlanillaEstado === 'A' ? 'Pendiente' : 
                     planilla.PlanillaEstado === 'B' ? 'Con alertas' : 
                     planilla.PlanillaEstado === 'C' ? 'Por revision' : 
                     planilla.PlanillaEstado === 'D' ? 'Revisado' : 'Inactivo'}
                  </span>
                </td>
                <td className="actions-cell">
                  <Link to={`/planillas/${planilla.PlanillaID}/ver`} className="btn btn-sm btn-info">
                                      Ver
                                    </Link>
                  <Link to={`/planillas/${planilla.PlanillaID}/editar`} className="btn btn-sm btn-warning">
                                      Editar
                                    </Link>
                  <button
                    onClick={() => handleDelete(planilla.PlanillaID)}
                    className="btn btn-sm btn-danger"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
