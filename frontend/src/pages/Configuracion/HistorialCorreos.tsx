import { useState, useEffect } from 'react';
import api from '../../api/axios';

interface HistorialCorreo {
  CorreoID: number;
  CorreoDestinatario: string;
  CorreoCC: string;
  CorreoAsunto: string;
  CorreoEstado: string;
  CorreoError: string;
  CorreoFechaEnvio: string;
  PlantillaNombre: string;
}

export default function HistorialCorreos() {
  const [correos, setCorreos] = useState<HistorialCorreo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState('');

  const limit = 20;

  useEffect(() => {
    fetchHistorial();
  }, [page, filtroEstado]);

  const fetchHistorial = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit };
      if (filtroEstado) params.estado = filtroEstado;
      
      const response = await api.get('/historial-correos', { params });
      setCorreos(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case 'ENVIADO': return 'status-active';
      case 'ERROR': return 'status-inactive';
      case 'PENDIENTE': return 'status-review';
      default: return '';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Historial de Correos</h1>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Estado:</label>
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
          >
            <option value="">Todos</option>
            <option value="ENVIADO">Enviados</option>
            <option value="ERROR">Error</option>
            <option value="PENDIENTE">Pendiente</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <>
          <div className="form-section">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Destinatario</th>
                  <th>Asunto</th>
                  <th>Plantilla</th>
                  <th>Estado</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {correos.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center' }}>
                      No hay correos registrados
                    </td>
                  </tr>
                ) : (
                  correos.map((correo) => (
                    <tr key={correo.CorreoID}>
                      <td>{new Date(correo.CorreoFechaEnvio).toLocaleString()}</td>
                      <td>{correo.CorreoDestinatario}</td>
                      <td>{correo.CorreoAsunto}</td>
                      <td>{correo.PlantillaNombre || '-'}</td>
                      <td>
                        <span className={`status ${getEstadoClass(correo.CorreoEstado)}`}>
                          {correo.CorreoEstado}
                        </span>
                      </td>
                      <td style={{ color: '#e74c3c', fontSize: '12px' }}>
                        {correo.CorreoError || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <span style={{ padding: '8px 16px' }}>
                Página {page} de {totalPages} (Total: {total})
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
