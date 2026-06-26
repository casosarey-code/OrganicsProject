import api from './axios';
import { Planilla, CreatePlanillaDTO } from '../types';

export const planillasApi = {
  getAll: async (params?: { fecha?: string; puntoVenta?: number; estado?: string }): Promise<Planilla[]> => {
    const response = await api.get<Planilla[]>('/planillas', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Planilla> => {
    const response = await api.get<Planilla>(`/planillas/${id}`);
    return response.data;
  },

  create: async (data: CreatePlanillaDTO): Promise<Planilla> => {
    const response = await api.post<Planilla>('/planillas', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreatePlanillaDTO>): Promise<Planilla> => {
    const response = await api.put<Planilla>(`/planillas/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/planillas/${id}`);
  },

  marcarRevisada: async (id: number): Promise<Planilla> => {
    const response = await api.patch<Planilla>(`/planillas/${id}/marcar-revisada`);
    return response.data;
  },

  uploadEvidencia: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ url: string }>('/evidencia/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
