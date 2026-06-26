import { useEffect, useState } from 'react';
import { usuariosApi, empresasApi } from '../../api';
import { Role, Empresa } from '../../types';
import './Usuarios.css';

interface UserWithRoles {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  UserEmpresaID?: number;
  roles: { id: number; name: string }[];
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<UserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    fullName: '',
    roles: [] as number[],
    UserEmpresaID: 0,
  });
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const fetchUsuarios = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [usersData, empresasData] = await Promise.all([
        usuariosApi.getAll(),
        empresasApi.getAll({ estado: 'A' }),
      ]);
      setUsuarios(usersData);
      setEmpresas(empresasData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async (): Promise<Role[]> => {
    const response = await fetch('/api/roles', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.json();
  };

  useEffect(() => {
    fetchUsuarios();
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const rolesData = await fetchRoles();
      setRoles(rolesData);
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      password: '',
      fullName: '',
      roles: [],
      UserEmpresaID: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (usuario: UserWithRoles) => {
    setFormData({
      email: usuario.email,
      username: usuario.username || '',
      password: '',
      fullName: usuario.fullName || '',
      roles: usuario.roles.map((r) => r.id),
      UserEmpresaID: usuario.UserEmpresaID || 0,
    });
    setEditingId(usuario.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        const { password, ...updateData } = formData;
        await usuariosApi.update(editingId, { ...updateData, ...(password && { password }) } as any);
      } else {
        await usuariosApi.create(formData as any);
      }
      resetForm();
      fetchUsuarios();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await usuariosApi.toggleStatus(id);
      fetchUsuarios();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await usuariosApi.delete(id);
      fetchUsuarios();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Configuración - Usuarios</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + Nuevo Usuario
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingId ? 'Editar' : 'Nuevo'} Usuario</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingId}
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingId}
                />
              </div>
              <div className="form-group">
                <label>{editingId ? 'Nueva Contraseña' : 'Contraseña'} *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingId}
                  placeholder={editingId ? 'Dejar vacío para no cambiar' : ''}
                />
              </div>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Empresa</label>
                <select
                  value={formData.UserEmpresaID}
                  onChange={(e) => setFormData({ ...formData, UserEmpresaID: parseInt(e.target.value) || 0 })}
                >
                  <option value={0}>Seleccionar empresa...</option>
                  {empresas.map((emp) => (
                    <option key={emp.EmpresaID} value={emp.EmpresaID}>
                      {emp.EmpresaNombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Roles</label>
                <div className="roles-select">
                  {roles.map((role) => (
                    <label key={role.id} className="role-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, roles: [...formData.roles, role.id] });
                          } else {
                            setFormData({ ...formData, roles: formData.roles.filter((r) => r !== role.id) });
                          }
                        }}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
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
      ) : usuarios.length === 0 ? (
        <div className="no-data">No hay usuarios registrados</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Username</th>
              <th>Nombre</th>
              <th>Empresa</th>
              <th>Roles</th>
              <th>Último Login</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr key={user.id}>
                <td>{user.id.slice(0, 8)}...</td>
                <td>{user.email}</td>
                <td>{user.username || '-'}</td>
                <td>{user.fullName || '-'}</td>
                <td>{empresas.find((e) => e.EmpresaID === user.UserEmpresaID)?.EmpresaNombre || '-'}</td>
                <td>{user.roles.map((r) => r.name).join(', ') || '-'}</td>
                <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Nunca'}</td>
                <td>
                  <span className={`status status-${user.isActive ? 'a' : 'i'}`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button onClick={() => handleEdit(user)} className="btn btn-sm btn-warning">
                    Editar
                  </button>
                  <button onClick={() => handleToggleStatus(user.id)} className="btn btn-sm btn-info">
                    {user.isActive ? 'Desact' : 'Act'}
                  </button>
                  <button onClick={() => handleDelete(user.id)} className="btn btn-sm btn-danger">
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
