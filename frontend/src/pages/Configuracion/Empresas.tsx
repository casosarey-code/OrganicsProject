import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { empresasApi } from '../../api';
import { Empresa } from '../../types';

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    EmpresaTipo: '',
    EmpresaNombre: '',
    EmpresaDescripcion: '',
    EmpresaDocumento: '',
    EmpresaNumeroDocumento: '',
    EmpresaCorreoNotificacion: '',
    EmpresaEnvioCorreo: true,
    EmpresaPlanilla: false,
    EmpresaLogo: '',
  });

  const fetchEmpresas = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await empresasApi.getAll();
      setEmpresas(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar empresas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const resetForm = () => {
    setFormData({
      EmpresaTipo: '',
      EmpresaNombre: '',
      EmpresaDescripcion: '',
      EmpresaDocumento: '',
      EmpresaNumeroDocumento: '',
      EmpresaCorreoNotificacion: '',
      EmpresaEnvioCorreo: true,
      EmpresaPlanilla: false,
      EmpresaLogo: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (empresa: Empresa) => {
    setFormData({
      EmpresaTipo: empresa.EmpresaTipo,
      EmpresaNombre: empresa.EmpresaNombre,
      EmpresaDescripcion: empresa.EmpresaDescripcion || '',
      EmpresaDocumento: empresa.EmpresaDocumento || '',
      EmpresaNumeroDocumento: empresa.EmpresaNumeroDocumento || '',
      EmpresaCorreoNotificacion: empresa.EmpresaCorreoNotificacion || '',
      EmpresaEnvioCorreo: empresa.EmpresaEnvioCorreo,
      EmpresaPlanilla: empresa.EmpresaTipo === 'Principal' ? false : ((empresa as any).EmpresaPlanilla || false),
      EmpresaLogo: (empresa as any).EmpresaLogo || '',
    });
    setEditingId(empresa.EmpresaID);
    setShowForm(true);
  };

  const handleTipoChange = (tipo: string) => {
    setFormData({
      ...formData,
      EmpresaTipo: tipo,
      EmpresaPlanilla: tipo === 'Principal' ? false : formData.EmpresaPlanilla,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await empresasApi.update(editingId, formData);
      } else {
        await empresasApi.create(formData);
      }
      fetchEmpresas();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        EmpresaTipo: '',
        EmpresaNombre: '',
        EmpresaDescripcion: '',
        EmpresaDocumento: '',
        EmpresaNumeroDocumento: '',
        EmpresaCorreoNotificacion: '',
        EmpresaEnvioCorreo: true,
        EmpresaPlanilla: false,
        EmpresaLogo: '',
      });
    } catch (err: any) {
      let errorMsg = 'Error al guardar';
      try {
        const errorData = err.response?.data;
        if (errorData) {
          if (typeof errorData === 'string') {
            errorMsg = errorData;
          } else if (Array.isArray(errorData)) {
            errorMsg = errorData.map((e: any) => e.message || e.path || JSON.stringify(e)).join(' | ');
          } else if (errorData.error) {
            if (Array.isArray(errorData.error)) {
              errorMsg = errorData.error.map((e: any) => e.message || e.path || JSON.stringify(e)).join(' | ');
            } else {
              errorMsg = String(errorData.error);
            }
          } else if (errorData.message) {
            errorMsg = String(errorData.message);
          } else {
            errorMsg = JSON.stringify(errorData);
          }
        }
      } catch (e) {
        errorMsg = 'Error al guardar';
      }
      setError(String(errorMsg));
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await empresasApi.toggleStatus(id);
      fetchEmpresas();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta empresa?')) return;
    try {
      await empresasApi.delete(id);
      fetchEmpresas();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Configuración - Empresas</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + Nueva Empresa
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingId ? 'Editar' : 'Nueva'} Empresa</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tipo *</label>
                <select
                  value={formData.EmpresaTipo}
                  onChange={(e) => handleTipoChange(e.target.value)}
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Punto de venta">Punto de venta</option>
                  <option value="Principal">Principal</option>
                </select>
              </div>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={formData.EmpresaNombre}
                  onChange={(e) => setFormData({ ...formData, EmpresaNombre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={formData.EmpresaDescripcion}
                  onChange={(e) => setFormData({ ...formData, EmpresaDescripcion: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Documento</label>
                <input
                  type="text"
                  value={formData.EmpresaDocumento}
                  onChange={(e) => setFormData({ ...formData, EmpresaDocumento: e.target.value })}
                  placeholder="NIT, RUC, etc."
                />
              </div>
              <div className="form-group">
                <label>Número Documento</label>
                <input
                  type="text"
                  value={formData.EmpresaNumeroDocumento}
                  onChange={(e) => setFormData({ ...formData, EmpresaNumeroDocumento: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Correo Notificación</label>
                <input
                  type="email"
                  value={formData.EmpresaCorreoNotificacion}
                  onChange={(e) => setFormData({ ...formData, EmpresaCorreoNotificacion: e.target.value })}
                />
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.EmpresaEnvioCorreo}
                    onChange={(e) => setFormData({ ...formData, EmpresaEnvioCorreo: e.target.checked })}
                  />
                  Enviar correos de notificación
                </label>
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.EmpresaPlanilla}
                    disabled={formData.EmpresaTipo === 'Principal'}
                    onChange={(e) => setFormData({ ...formData, EmpresaPlanilla: e.target.checked })}
                  />
                  Genera Planillas (clonar productos)
                </label>
                {formData.EmpresaTipo === 'Principal' && (
                  <small style={{ color: '#7f8c8d', marginLeft: '8px' }}>
                    (Las empresas principales no generan planillas)
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Logo (URL)</label>
                <input
                  type="url"
                  value={formData.EmpresaLogo}
                  onChange={(e) => setFormData({ ...formData, EmpresaLogo: e.target.value })}
                  placeholder="https://ejemplo.com/logo.png"
                />
                {formData.EmpresaLogo && (
                  <div style={{ marginTop: '8px' }}>
                    <img src={formData.EmpresaLogo} alt="Logo预览" style={{ maxHeight: '50px', maxWidth: '150px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
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
      ) : empresas.length === 0 ? (
        <div className="no-data">No hay empresas registradas</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Correo</th>
              <th>Estado</th>
              <th>Planillas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((emp) => (
              <tr key={emp.EmpresaID}>
                <td>{emp.EmpresaID}</td>
                <td>{emp.EmpresaTipo}</td>
                <td>{emp.EmpresaNombre}</td>
                <td>{emp.EmpresaNumeroDocumento || '-'}</td>
                <td>{emp.EmpresaCorreoNotificacion || '-'}</td>
                <td>
                  <span className={`status status-${emp.EmpresaEstado.toLowerCase()}`}>
                    {emp.EmpresaEstado === 'A' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>{emp._count?.planillas || 0}</td>
                <td className="actions-cell">
                  <Link to={`/config/empresas/${emp.EmpresaID}/productos`} className="btn btn-sm btn-info">
                    Productos
                  </Link>
                  <button onClick={() => handleEdit(emp)} className="btn btn-sm btn-warning">
                    Editar
                  </button>
                  <button onClick={() => handleToggleStatus(emp.EmpresaID)} className="btn btn-sm btn-info">
                    {emp.EmpresaEstado === 'A' ? 'Desact' : 'Act'}
                  </button>
                  <button onClick={() => handleDelete(emp.EmpresaID)} className="btn btn-sm btn-danger">
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
