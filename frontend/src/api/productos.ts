import api from './axios';
import { Producto } from '../types';

export const productosApi = {
  getAll: async (params?: { activo?: boolean }): Promise<Producto[]> => {
    const response = await api.get<Producto[]>('/productos', {
      params: params?.activo !== undefined ? { activo: String(params.activo) } : undefined,
    });
    return response.data;
  },

  getById: async (id: number): Promise<Producto> => {
    const response = await api.get<Producto>(`/productos/${id}`);
    return response.data;
  },

  create: async (data: Partial<Producto>): Promise<Producto> => {
    const response = await api.post<Producto>('/productos', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Producto>): Promise<Producto> => {
    const response = await api.put<Producto>(`/productos/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id: number): Promise<void> => {
    await api.patch(`/productos/${id}/toggle-status`);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/productos/${id}`);
  },
};
