import { useState, useEffect } from 'react';
import api from '../../api/axios';

interface PlantillaCorreo {
  PlantillaID: number;
  PlantillaNombre: string;
  PlantillaAsunto: string;
  PlantillaCuerpo: string;
  PlantillaVariables: string[];
  PlantillaTipo: string;
  PlantillaActivo: boolean;
}

export default function PlantillasEmail() {
  const [plantillas, setPlantillas] = useState<PlantillaCorreo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [plantillaEditando, setPlantillaEditando] = useState<PlantillaCorreo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    fetchPlantillas();
  }, []);

  const fetchPlantillas = async () => {
    try {
      const response = await api.get('/plantillas-correo');
      setPlantillas(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (plantilla: PlantillaCorreo) => {
    setPlantillaEditando({ ...plantilla });
  };

  const handleChange = (field: keyof PlantillaCorreo, value: string | boolean) => {
    if (plantillaEditando) {
      setPlantillaEditando({ ...plantillaEditando, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!plantillaEditando) return;

    setIsSaving(true);
    setMensaje('');
    try {
      await api.put(`/plantillas-correo/${plantillaEditando.PlantillaID}`, plantillaEditando);
      setMensaje('Plantilla guardada correctamente');
      setPlantillaEditando(null);
      fetchPlantillas();
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setMensaje('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPlantillaEditando(null);
  };

  if (isLoading) return <div className="loading">Cargando...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Plantillas de Email</h1>
      </div>

      {mensaje && (
        <div className={mensaje.includes('Error') ? 'error-message' : 'success-message'}>
          {mensaje}
        </div>
      )}

      <div className="form-section">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Asunto</th>
              <th>Variables</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {plantillas.map((plantilla) => (
              <tr key={plantilla.PlantillaID}>
                <td>{plantilla.PlantillaNombre}</td>
                <td>{plantilla.PlantillaAsunto}</td>
                <td>
                  <span style={{ fontSize: '11px', color: '#7f8c8d' }}>
                    {plantilla.PlantillaVariables?.join(', ') || 'Ninguna'}
                  </span>
                </td>
                <td>
                  <span className={`status ${plantilla.PlantillaActivo ? 'status-active' : 'status-inactive'}`}>
                    {plantilla.PlantillaActivo ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-info"
                    onClick={() => handleEdit(plantilla)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plantillaEditando && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Plantilla: {plantillaEditando.PlantillaNombre}</h2>
            
            <div className="form-group">
              <label>Asunto</label>
              <input
                type="text"
                value={plantillaEditando.PlantillaAsunto}
                onChange={(e) => handleChange('PlantillaAsunto', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Cuerpo del Email (HTML)</label>
              <textarea
                value={plantillaEditando.PlantillaCuerpo}
                onChange={(e) => handleChange('PlantillaCuerpo', e.target.value)}
                rows={12}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
              <small style={{ color: '#7f8c8d', fontSize: '11px' }}>
                Variables disponibles: {plantillaEditando.PlantillaVariables?.map(v => `{{${v}}}`).join(', ') || 'Ninguna'}
              </small>
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={plantillaEditando.PlantillaActivo}
                  onChange={(e) => handleChange('PlantillaActivo', e.target.checked)}
                />
                Plantilla activa
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleCancel}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
