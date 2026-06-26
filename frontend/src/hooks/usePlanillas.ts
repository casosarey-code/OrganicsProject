import { useState, useEffect } from 'react';
import { planillasApi } from '../api';
import { Planilla, CreatePlanillaDTO } from '../types';

export function usePlanillas(initialParams?: { fecha?: string; puntoVenta?: number; estado?: string }) {
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanillas = async (params?: { fecha?: string; puntoVenta?: number; estado?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await planillasApi.getAll(params || initialParams);
      setPlanillas(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar planillas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanillas();
  }, []);

  const createPlanilla = async (data: CreatePlanillaDTO) => {
    const newPlanilla = await planillasApi.create(data);
    setPlanillas((prev) => [newPlanilla, ...prev]);
    return newPlanilla;
  };

  const updatePlanilla = async (id: number, data: Partial<CreatePlanillaDTO>) => {
    const updated = await planillasApi.update(id, data);
    setPlanillas((prev) => prev.map((p) => (p.PlanillaID === id ? updated : p)));
    return updated;
  };

  const deletePlanilla = async (id: number) => {
    await planillasApi.delete(id);
    setPlanillas((prev) => prev.filter((p) => p.PlanillaID !== id));
  };

  return {
    planillas,
    isLoading,
    error,
    fetchPlanillas,
    createPlanilla,
    updatePlanilla,
    deletePlanilla,
  };
}

export function usePlanilla(id: number) {
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlanilla = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await planillasApi.getById(id);
        setPlanilla(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al cargar planilla');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPlanilla();
    }
  }, [id]);

  return { planilla, isLoading, error };
}
