import { useEffect, useState } from 'react';
import './Roles.css';

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface Permission {
  id: number;
  name: string;
  resource?: string;
  action?: string;
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/roles', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/permissions', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      setRoles(rolesRes);
      setPermissions(permsRes);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const method = editingRole ? 'PUT' : 'POST';
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      setFormData({ name: '', description: '' });
      setEditingRole(null);
      fetchData();
    } catch (err) {
      alert('Error al guardar');
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || '' });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar rol?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  if (isLoading) return <div className="loading">Cargando...</div>;


  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Configuración - Roles y Permisos</h1>
        <button onClick={() => { setEditingRole(null); setFormData({ name: '', description: '' }); setShowModal(true); }} className="btn btn-primary">
          + Nuevo Rol
        </button>
      </div>

      <div className="config-grid">
        {/* Roles */}
        <div className="config-section">
          <h2>Roles</h2>
          {roles.length === 0 ? (
            <div className="no-data"><p>No hay roles</p></div>
          ) : (
            <div className="items-list">
              {roles.map(role => (
                <div key={role.id} className="item-card">
                  <div className="item-info">
                    <span className="item-name">{role.name}</span>
                    <span className="item-desc">{role.description || '-'}</span>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => handleEdit(role)} className="btn btn-sm btn-warning">Editar</button>
                    <button onClick={() => handleDelete(role.id)} className="btn btn-sm btn-danger">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Permisos */}
        <div className="config-section">
          <h2>Permisos</h2>
          {permissions.length === 0 ? (
            <div className="no-data"><p>No hay permisos</p></div>
          ) : (
            <div className="permissions-grid">
              {permissions.map(perm => (
                <div key={perm.id} className="permission-badge">
                  <span className="perm-name">{perm.name}</span>
                  <span className="perm-resource">{perm.resource}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: admin, editor, viewer"
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del rol"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
