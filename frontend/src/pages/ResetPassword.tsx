import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../styles/auth.css';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken(token);
    }
  }, [token]);

  const validateToken = async (token: string) => {
    try {
      const response = await api.get(`/auth/validate-token/${token}`);
      setIsValid(true);
      setEmail(response.data.email);
    } catch (err: any) {
      setIsValid(false);
      setError(err.response?.data?.error || 'Token inválido o expirado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: password
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al restablecer contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="loading">Validando enlace...</div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>🔒 Enlace Inválido</h1>
          </div>
          <div className="error-message">
            <p>{error}</p>
            <p>El enlace de recuperación puede haber expirado o ya fue utilizado.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/login')}
            >
              Volver al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>✅ Contraseña Actualizada</h1>
          </div>
          <div className="success-message">
            <p>Tu contraseña ha sido actualizada correctamente.</p>
            <p>Serás redirigido al login en unos segundos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🔑 Nueva Contraseña</h1>
          <p>Ingresa tu nueva contraseña para {email}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nueva Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Contraseña'}
          </button>
        </form>

        <div className="login-footer">
          <button 
            className="btn-link"
            onClick={() => navigate('/login')}
          >
            ← Volver al Login
          </button>
        </div>
      </div>
    </div>
  );
}
