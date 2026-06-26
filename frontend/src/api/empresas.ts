import api from './axios';
import { Empresa } from '../types';

export const empresasApi = {
  getAll: async (params?: { estado?: string }): Promise<Empresa[]> => {
    const response = await api.get<Empresa[]>('/empresas', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Empresa> => {
    const response = await api.get<Empresa>(`/empresas/${id}`);
    return response.data;
  },

  create: async (data: Partial<Empresa>): Promise<Empresa> => {
    const response = await api.post<Empresa>('/empresas', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Empresa>): Promise<Empresa> => {
    const response = await api.put<Empresa>(`/empresas/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id: number): Promise<void> => {
    await api.patch(`/empresas/${id}/toggle-status`);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/empresas/${id}`);
  },
};
