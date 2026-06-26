import { useEffect, useState } from 'react';
import './GestionarPermisos.css';

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

export default function GestionarPermisos() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any>({});
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const rolesRes = await fetch('/api/roles', { headers }).then(r => r.json());
      const permsRes = await fetch('/api/permissions', { headers }).then(r => r.json());
      const rolePermsRes = await fetch('/api/permissions/role-permissions', { headers }).then(r => r.json());
      
      setRoles(rolesRes);
      setPermissions(permsRes);
      setRolePermissions(rolePermsRes);
      
      if (rolesRes.length > 0) {
        setSelectedRole(rolesRes[0].id);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = async (roleId: number, permId: number) => {
    try {
      const token = localStorage.getItem('token');
      const hasPerm = rolePermissions[roleId]?.includes(permId);
      
      if (hasPerm) {
        await fetch(`/api/permissions/role-permissions/${roleId}/${permId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch('/api/permissions/role-permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ roleId, permissionId: permId }),
        });
      }
      
      // Actualizar estado local
      setRolePermissions(prev => ({
        ...prev,
        [roleId]: hasPerm 
          ? prev[roleId].filter(id => id !== permId)
          : [...(prev[roleId] || []), permId]
      }));
    } catch (err) {
      alert('Error al actualizar permiso');
    }
  };

  // Agrupar permisos por recurso
  const groupedPerms = permissions.reduce((acc: any, perm: any) => {
    const resource = perm.resource || 'otro';
    if (!acc[resource]) acc[resource] = [];
    acc[resource].push(perm);
    return acc;
  }, {});

  if (isLoading) return <div className="loading">Cargando...</div>;
  
  console.log('Roles:', roles);
  console.log('Permissions:', permissions);
  console.log('RolePermissions:', rolePermissions);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestionar Permisos por Rol</h1>
      </div>

      <div className="perm-manager">
        {/* Selector de rol */}
        <div className="role-selector">
          <h2>Seleccionar Rol</h2>
          <div className="role-tabs">
            {roles.map(role => (
              <button
                key={role.id}
                className={`role-tab ${selectedRole === role.id ? 'active' : ''}`}
                onClick={() => setSelectedRole(role.id)}
              >
                {role.name}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de permisos */}
        <div className="perm-list">
          <h2>Permisos para el rol</h2>
          {Object.entries(groupedPerms).map(([resource, perms]) => (
            <div key={resource} className="perm-group">
              <h3>{resource.toUpperCase()}</h3>
              <div className="perm-items">
                {perms.map(perm => {
                  const isAssigned = rolePermissions[selectedRole || 0]?.includes(perm.id);
                  return (
                    <label key={perm.id} className={`perm-item ${isAssigned ? 'assigned' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => selectedRole && togglePermission(selectedRole, perm.id)}
                      />
                      <span className="perm-action">{perm.action}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
