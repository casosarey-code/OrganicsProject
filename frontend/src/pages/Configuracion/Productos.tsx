import { useEffect, useState } from 'react';
import { productosApi } from '../../api';
import { Producto } from '../../types';
import GestionComposiciones from './GestionComposiciones';

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showComposiciones, setShowComposiciones] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    ProductoNombre: '',
    ProductoCodigo: '',
    ProductoPrecio: 0,
    ProductoStock: 0,
    ProductoActivo: true,
    ProductoSoloContabilidad: false,
  });

  const fetchProductos = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await productosApi.getAll();
      setProductos(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const resetForm = () => {
    setFormData({
      ProductoNombre: '',
      ProductoCodigo: '',
      ProductoPrecio: 0,
      ProductoStock: 0,
      ProductoActivo: true,
      ProductoSoloContabilidad: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (producto: Producto) => {
    setFormData({
      ProductoNombre: producto.ProductoNombre,
      ProductoCodigo: producto.ProductoCodigo || '',
      ProductoPrecio: producto.ProductoPrecio,
      ProductoStock: producto.ProductoStock,
      ProductoActivo: producto.ProductoActivo,
      ProductoSoloContabilidad: producto.ProductoSoloContabilidad || false,
    });
    setEditingId(producto.ProductoID);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await productosApi.update(editingId, formData);
      } else {
        await productosApi.create(formData);
      }
      resetForm();
      fetchProductos();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await productosApi.toggleStatus(id);
      fetchProductos();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleToggleSoloContabilidad = async (id: number) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/productos/${id}/toggle-solo-contabilidad`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      fetchProductos();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await productosApi.delete(id);
      fetchProductos();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  if (showComposiciones) {
    return <GestionComposiciones onBack={() => setShowComposiciones(false)} />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Configuración - Productos</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowComposiciones(true)} className="btn btn-secondary">
            ⚙️ Composiciones
          </button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            + Nuevo Producto
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingId ? 'Editar' : 'Nuevo'} Producto</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={formData.ProductoNombre}
                  onChange={(e) => setFormData({ ...formData, ProductoNombre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Código</label>
                <input
                  type="text"
                  value={formData.ProductoCodigo}
                  onChange={(e) => setFormData({ ...formData, ProductoCodigo: e.target.value })}
                  placeholder="Código único (opcional)"
                />
              </div>
              <div className="form-group">
                <label>Precio *</label>
                <input
                  type="number"
                  value={formData.ProductoPrecio || ''}
                  onChange={(e) => setFormData({ ...formData, ProductoPrecio: parseFloat(e.target.value) || 0 })}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Stock Inicial</label>
                <input
                  type="number"
                  value={formData.ProductoStock || ''}
                  onChange={(e) => setFormData({ ...formData, ProductoStock: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.ProductoActivo}
                    onChange={(e) => setFormData({ ...formData, ProductoActivo: e.target.checked })}
                  />
                  Producto Activo
                </label>
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.ProductoSoloContabilidad}
                    onChange={(e) => setFormData({ ...formData, ProductoSoloContabilidad: e.target.checked })}
                  />
                  Solo Contabilidad (no genera filas en planilla de inventario)
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={resetForm} className="btn btn-secondary">
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
      ) : productos.length === 0 ? (
        <div className="no-data">No hay productos registrados</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Solo Contab.</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((prod) => (
              <tr key={prod.ProductoID}>
                <td>{prod.ProductoID}</td>
                <td>{prod.ProductoCodigo || '-'}</td>
                <td>{prod.ProductoNombre}</td>
                <td>${prod.ProductoPrecio.toLocaleString()}</td>
                <td>{prod.ProductoStock}</td>
                <td>
                  <button 
                    onClick={() => handleToggleSoloContabilidad(prod.ProductoID)} 
                    className={`btn btn-sm ${prod.ProductoSoloContabilidad ? 'btn-success' : 'btn-default'}`}
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                  >
                    {prod.ProductoSoloContabilidad ? '✓ Sí' : 'No'}
                  </button>
                </td>
                <td>
                  <span className={`status status-${prod.ProductoActivo ? 'a' : 'i'}`}>
                    {prod.ProductoActivo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button onClick={() => handleEdit(prod)} className="btn btn-sm btn-warning">
                    Editar
                  </button>
                  <button onClick={() => handleToggleStatus(prod.ProductoID)} className="btn btn-sm btn-info">
                    {prod.ProductoActivo ? 'Desact' : 'Act'}
                  </button>
                  <button onClick={() => handleDelete(prod.ProductoID)} className="btn btn-sm btn-danger">
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
