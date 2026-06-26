import { useState, useEffect } from 'react';
import api from '../../api/axios';

interface CarruselImagen {
  imagen: string;
  titulo: string;
}

interface ParametrosGenerales {
  PGID: number;
  PGImagenLogin: string;
  PGNombrePlataforma: string;
  PGImagenPlataforma: string;
  PGRecuperacionPass: boolean;
  PGImagenesCarrusel: CarruselImagen[];
}

export default function ConfiguracionGeneral() {
  const [parametros, setParametros] = useState<ParametrosGenerales | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    fetchParametros();
  }, []);

  const fetchParametros = async () => {
    try {
      const response = await api.get('/parametros-generales');
      const data = response.data;
      // Parsear el JSON de imágenes del carrusel si viene como string
      if (data.PGImagenesCarrusel && typeof data.PGImagenesCarrusel === 'string') {
        try {
          data.PGImagenesCarrusel = JSON.parse(data.PGImagenesCarrusel);
        } catch (e) {
          data.PGImagenesCarrusel = [];
        }
      } else if (!data.PGImagenesCarrusel) {
        data.PGImagenesCarrusel = [];
      }
      setParametros(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof ParametrosGenerales, value: string | boolean | CarruselImagen[]) => {
    if (parametros) {
      setParametros({ ...parametros, [field]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parametros) return;

    setIsSaving(true);
    setMensaje('');
    try {
      await api.put('/parametros-generales', parametros);
      setMensaje('Cambios guardados correctamente');
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setMensaje('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // Manejar imágenes del carrusel
  const agregarImagenCarrusel = () => {
    if (parametros) {
      const nuevasImagenes = [...(parametros.PGImagenesCarrusel || []), { imagen: '', titulo: '' }];
      handleChange('PGImagenesCarrusel', nuevasImagenes);
    }
  };

  const eliminarImagenCarrusel = (index: number) => {
    if (parametros) {
      const nuevasImagenes = (parametros.PGImagenesCarrusel || []).filter((_, i) => i !== index);
      handleChange('PGImagenesCarrusel', nuevasImagenes);
    }
  };

  const actualizarImagenCarrusel = (index: number, campo: 'imagen' | 'titulo', valor: string) => {
    if (parametros) {
      const nuevasImagenes = [...(parametros.PGImagenesCarrusel || [])];
      nuevasImagenes[index] = { ...nuevasImagenes[index], [campo]: valor };
      handleChange('PGImagenesCarrusel', nuevasImagenes);
    }
  };

  if (isLoading) return <div className="loading">Cargando...</div>;
  if (!parametros) return <div className="no-data">Error al cargar parámetros</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Configuración General</h1>
      </div>

      {mensaje && <div className={mensaje.includes('Error') ? 'error-message' : 'success-message'}>{mensaje}</div>}

      <form onSubmit={handleSubmit} className="form-section">
        <h3>Personalización de la Plataforma</h3>

        <div className="form-grid">
          <div className="form-group">
            <label>Nombre de la Plataforma</label>
            <input
              type="text"
              value={parametros.PGNombrePlataforma}
              onChange={(e) => handleChange('PGNombrePlataforma', e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Permitir Recuperación de Contraseña</label>
            <select
              value={parametros.PGRecuperacionPass ? 'true' : 'false'}
              onChange={(e) => handleChange('PGRecuperacionPass', e.target.value === 'true')}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>URL Imagen de Login</label>
            <input
              type="url"
              value={parametros.PGImagenLogin || ''}
              onChange={(e) => handleChange('PGImagenLogin', e.target.value)}
              placeholder="https://ejemplo.com/imagen-login.png"
            />
            <small style={{ color: '#7f8c8d', fontSize: '11px' }}>
              URL de la imagen que aparece en la pantalla de login
            </small>
          </div>

          <div className="form-group">
            <label>URL Logo de la Plataforma</label>
            <input
              type="url"
              value={parametros.PGImagenPlataforma || ''}
              onChange={(e) => handleChange('PGImagenPlataforma', e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
            />
            <small style={{ color: '#7f8c8d', fontSize: '11px' }}>
              Logo que se muestra en el sidebar
            </small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      {/* Sección de Imágenes del Carrusel */}
      <form onSubmit={handleSubmit} className="form-section">
        <div className="section-header">
          <h3>Imágenes del Carrusel (Resumen)</h3>
          <button type="button" onClick={agregarImagenCarrusel} className="btn btn-sm btn-primary">
            + Agregar Imagen
          </button>
        </div>

        <p style={{ marginBottom: '16px', color: '#7f8c8d', fontSize: '13px' }}>
          Las imágenes configuradas aquí aparecerán en el carrusel del Resumen. Puede agregar hasta 10 imágenes.
        </p>

        {(parametros.PGImagenesCarrusel || []).length === 0 ? (
          <div className="no-data">
            No hay imágenes configuradas. Haga clic en "Agregar Imagen" para comenzar.
          </div>
        ) : (
          <div className="carrusel-config-list">
            {(parametros.PGImagenesCarrusel || []).map((img, index) => (
              <div key={index} className="carrusel-config-item">
                <div className="carrusel-config-num">#{index + 1}</div>
                <div className="carrusel-config-fields">
                  <div className="form-group">
                    <label>Título</label>
                    <input
                      type="text"
                      value={img.titulo}
                      onChange={(e) => actualizarImagenCarrusel(index, 'titulo', e.target.value)}
                      placeholder="Título de la imagen"
                    />
                  </div>
                  <div className="form-group">
                    <label>URL de la Imagen</label>
                    <input
                      type="url"
                      value={img.imagen}
                      onChange={(e) => actualizarImagenCarrusel(index, 'imagen', e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>
                </div>
                {img.imagen && (
                  <div className="carrusel-config-preview">
                    <img src={img.imagen} alt={img.titulo} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => eliminarImagenCarrusel(index)}
                  className="btn btn-danger btn-sm"
                  style={{ marginLeft: '8px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="form-actions" style={{ marginTop: '16px' }}>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Imágenes'}
          </button>
        </div>
      </form>
    </div>
  );
}
