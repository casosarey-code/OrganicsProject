import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productosApi } from '../../api';
import { Producto } from '../../types';

interface Composicion {
  PCID: number;
  PCProducto: number;
  PCComponente: number;
  PCCantidad: number;
  producto: { ProductoID: number; ProductoNombre: string };
  componente: { ProductoID: number; ProductoNombre: string };
}

interface Props {
  onBack?: () => void;
}

export default function GestionComposiciones({ onBack }: Props = {}) {
  const navigate = useNavigate();
  const goBack = onBack || (() => navigate('/config/productos'));
  const [composiciones, setComposiciones] = useState<Composicion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    PCProducto: 0,
    PCComponente: 0,
    PCCantidad: 1,
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const [compRes, prodRes] = await Promise.all([
        fetch(`/api/productos/composicion`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        productosApi.getAll(),
      ]);
      const compData = await compRes.json();
      let prodData = [];
      if (prodRes && typeof prodRes === 'object' && 'data' in prodRes) {
        prodData = (prodRes as any).data;
      } else if (Array.isArray(prodRes)) {
        prodData = prodRes;
      }
      setComposiciones(Array.isArray(compData) ? compData : []);
      setProductos(Array.isArray(prodData) ? prodData : []);
    } catch (err: any) {
      console.error('Error completo:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/productos/composicion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear');
      }
      setShowForm(false);
      setFormData({ PCProducto: 0, PCComponente: 0, PCCantidad: 1 });
      // Recargar solo los datos para mantener la vista
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta composición?')) return;
    try {
      await fetch(`/api/productos/composicion/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleUpdateCantidad = async (id: number, cantidad: number) => {
    try {
      await fetch(`/api/productos/composicion/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ PCCantidad: cantidad }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al actualizar');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={goBack} className="btn btn-secondary">← Volver</button>
          <h1>Gestión de Composiciones</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + Nueva Composición
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '10px' }}>¿Qué son las composiciones?</h4>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Las composiciones permiten que un producto "sume" al inventario de otro producto. 
          <br />
          <strong>Ejemplo:</strong> "1/4 Pollo" suma 0.25 al producto "Pollo" en los campos de inventario.
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Nueva Composición</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Producto (el que vende) *</label>
                <select
                  value={formData.PCProducto}
                  onChange={(e) => setFormData({ ...formData, PCProducto: parseInt(e.target.value) })}
                  required
                >
                  <option value={0}>Seleccionar producto...</option>
                  {productos.map((p) => (
                    <option key={p.ProductoID} value={p.ProductoID}>
                      {p.ProductoNombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Suma a (componente) *</label>
                <select
                  value={formData.PCComponente}
                  onChange={(e) => setFormData({ ...formData, PCComponente: parseInt(e.target.value) })}
                  required
                >
                  <option value={0}>Seleccionar producto...</option>
                  {productos.map((p) => (
                    <option key={p.ProductoID} value={p.ProductoID}>
                      {p.ProductoNombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Cantidad a sumar *</label>
                <input
                  type="number"
                  value={formData.PCCantidad}
                  onChange={(e) => setFormData({ ...formData, PCCantidad: parseFloat(e.target.value) })}
                  required
                  min="0.0001"
                  step="0.0001"
                />
                <small style={{ color: '#666' }}>
                  Ejemplo: 0.25 para 1/4, 0.5 para 1/2, 1 para entero
                </small>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Cargando...</div>
      ) : composiciones.length === 0 ? (
        <div className="no-data">
          No hay composiciones configuradas. Haz clic en "Nueva Composición" para agregar una.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Suma a</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {composiciones.map((comp) => (
              <tr key={comp.PCID}>
                <td>{comp.producto?.ProductoNombre || `ID: ${comp.PCProducto}`}</td>
                <td>
                  <input
                    type="number"
                    value={comp.PCCantidad}
                    onChange={(e) => {
                      const newVal = parseFloat(e.target.value);
                      if (newVal > 0) handleUpdateCantidad(comp.PCID, newVal);
                    }}
                    min="0.0001"
                    step="0.0001"
                    style={{ width: '80px' }}
                  />
                </td>
                <td>{comp.componente?.ProductoNombre || `ID: ${comp.PCComponente}`}</td>
                <td>
                  <button onClick={() => handleDelete(comp.PCID)} className="btn btn-sm btn-danger">
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
