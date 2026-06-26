import { useState, useEffect } from 'react';
import api from '../../api/axios';

interface ConfigSMTP {
  smtpid: number;
  smtphost: string;
  smtpport: number;
  smtpusuario: string;
  smtppassword: string;
  smtpfromemail: string;
  smtpfromname: string;
  smtpsecure: string;
  smtpauth: boolean;
  smtptimeout: number;
}

export default function ConfiguracionEmail() {
  const [config, setConfig] = useState<ConfigSMTP | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/configuracion-smtp');
      setConfig(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof ConfigSMTP, value: string | number | boolean) => {
    if (config) {
      setConfig({ ...config, [field]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setIsSaving(true);
    setMensaje('');
    try {
      await api.put('/configuracion-smtp', config);
      setMensaje('Configuración guardada correctamente');
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setMensaje('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const probarConexion = async () => {
    if (!config) return;
    
    setMensaje('Probando conexión...');
    try {
      const response = await api.post('/configuracion-smtp/test');
      if (response.data.success) {
        setMensaje('✅ ' + response.data.message);
      } else {
        setMensaje('❌ ' + response.data.error);
      }
    } catch (error: any) {
      setMensaje('❌ ' + (error.response?.data?.error || 'Error al probar conexión'));
    }
  };

  if (isLoading) return <div className="loading">Cargando...</div>;
  if (!config) return <div className="no-data">Error al cargar configuración</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Configuración de Email (SMTP)</h1>
      </div>

      {mensaje && (
        <div className={mensaje.includes('Error') ? 'error-message' : 'success-message'}>
          {mensaje}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-section">
        <h3>Servidor SMTP</h3>

        <div className="form-grid">
          <div className="form-group">
            <label>Host SMTP</label>
            <input
              type="text"
              value={config.smtphost}
              onChange={(e) => handleChange('smtphost', e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </div>

          <div className="form-group">
            <label>Puerto</label>
            <input
              type="number"
              value={config.smtpport}
              onChange={(e) => handleChange('smtpport', parseInt(e.target.value) || 0)}
              placeholder="587"
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Tipo de Seguridad</label>
            <select
              value={config.smtpsecure}
              onChange={(e) => handleChange('smtpsecure', e.target.value)}
            >
              <option value="TLS">TLS</option>
              <option value="SSL">SSL</option>
              <option value="NONE">Ninguna</option>
            </select>
          </div>

          <div className="form-group">
            <label>Timeout (ms)</label>
            <input
              type="number"
              value={config.smtptimeout}
              onChange={(e) => handleChange('smtptimeout', parseInt(e.target.value) || 10000)}
            />
          </div>
        </div>

        <h3>Credenciales</h3>

        <div className="form-grid">
          <div className="form-group">
            <label>Usuario / Email</label>
            <input
              type="text"
              value={config.smtpusuario}
              onChange={(e) => handleChange('smtpusuario', e.target.value)}
              placeholder="correo@gmail.com"
            />
          </div>

          <div className="form-group">
            <label>Contraseña / App Password</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={config.smtppassword}
                onChange={(e) => handleChange('smtppassword', e.target.value)}
                placeholder="Contraseña de aplicación"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMostrarPassword(!mostrarPassword)}
              >
                {mostrarPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            <small style={{ color: '#7f8c8d', fontSize: '11px' }}>
              Para Gmail usa una "Contraseña de aplicación"
            </small>
          </div>
        </div>

        <h3>Remitente</h3>

        <div className="form-grid">
          <div className="form-group">
            <label>Email Remitente</label>
            <input
              type="email"
              value={config.smtpfromemail}
              onChange={(e) => handleChange('smtpfromemail', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Nombre Remitente</label>
            <input
              type="text"
              value={config.smtpfromname}
              onChange={(e) => handleChange('smtpfromname', e.target.value)}
            />
          </div>
        </div>

        <h3>Opciones</h3>

        <div className="form-row">
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.smtpauth}
                onChange={(e) => handleChange('smtpauth', e.target.checked)}
              />
              Autenticación requerida
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={probarConexion}
          >
            Probar Conexión
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
