import api from './axios';
import { User } from '../types';

interface UserWithRoles {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  roles: { id: number; name: string }[];
  UserEmpresaID?: number;
}

export const usuariosApi = {
  getAll: async (params?: { activo?: boolean }): Promise<UserWithRoles[]> => {
    const response = await api.get<UserWithRoles[]>('/usuarios', {
      params: params?.activo !== undefined ? { activo: String(params.activo) } : undefined,
    });
    return response.data;
  },

  getById: async (id: string): Promise<UserWithRoles> => {
    const response = await api.get<UserWithRoles>(`/usuarios/${id}`);
    return response.data;
  },

  create: async (data: Partial<User> & { password: string; roles?: number[]; UserEmpresaID?: number }): Promise<UserWithRoles> => {
    const response = await api.post<UserWithRoles>('/usuarios', data);
    return response.data;
  },

  update: async (id: string, data: Partial<User> & { roles?: number[]; UserEmpresaID?: number }): Promise<UserWithRoles> => {
    const response = await api.put<UserWithRoles>(`/usuarios/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id: string): Promise<void> => {
    await api.patch(`/usuarios/${id}/toggle-status`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/usuarios/${id}`);
  },
};
