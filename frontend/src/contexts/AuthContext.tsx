import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginDTO, RegisterDTO } from '../types';
import { authApi } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  permissionsLoaded: boolean;
  login: (data: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => void;
  hasPermission: (permName: string) => boolean;
  hasRole: (roleName: string) => boolean;
  userRoles: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedPermissions = localStorage.getItem('permissions');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      if (storedPermissions) {
        setPermissions(JSON.parse(storedPermissions));
      }
    }

    setIsLoading(false);
  }, []);

  // Cargar permisos del usuario y actualizar usuario
  useEffect(() => {
    const fetchUserData = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) return;

      try {
        const response = await fetch('/api/usuarios/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          
          // Actualizar usuario con UserEmpresaID
          if (data.UserEmpresaID !== undefined) {
            setUser((prev) => prev ? { ...prev, UserEmpresaID: data.UserEmpresaID } : null);
            localStorage.setItem('user', JSON.stringify({ 
              ...JSON.parse(localStorage.getItem('user') || '{}'),
              UserEmpresaID: data.UserEmpresaID
            }));
          }
          
          // Extraer permisos de los roles
          const userPerms: string[] = [];
          const rolesNames: string[] = [];
          const adminRoles = ['admin'];
          let isUserAdmin = false;
          
          if (data.roles && Array.isArray(data.roles)) {
            data.roles.forEach((role: any) => {
              rolesNames.push(role.name);
              if (adminRoles.includes(role.name)) {
                isUserAdmin = true;
              }
              if (role.rolePermissions) {
                role.rolePermissions.forEach((rp: any) => {
                  if (rp.permission && rp.permission.name) {
                    userPerms.push(rp.permission.name);
                  }
                });
              }
            });
          }
          
          setPermissions(userPerms);
          setUserRoles(rolesNames);
          setIsAdmin(isUserAdmin);
          setPermissionsLoaded(true);
          localStorage.setItem('permissions', JSON.stringify(userPerms));
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    if (token) {
      fetchUserData();
    }
  }, [token]);

  const hasPermission = (permName: string): boolean => {
    // Admin siempre tiene todos los permisos
    if (isAdmin) return true;
    return permissions.includes(permName);
  };

  const hasRole = (roleName: string): boolean => {
    return userRoles.includes(roleName);
  };

  const login = async (data: LoginDTO) => {
    const response = await authApi.login(data);
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
  };

  const register = async (data: RegisterDTO) => {
    const response = await authApi.register(data);
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    setToken(null);
    setUser(null);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        permissions,
        permissionsLoaded,
        login,
        register,
        logout,
        hasPermission,
        hasRole,
        userRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
