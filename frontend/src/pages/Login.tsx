import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import '../styles/auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [platformName, setPlatformName] = useState('OrganicsProject');
  const [loginLogo, setLoginLogo] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlatformConfig = async () => {
      try {
        const response = await fetch('/api/parametros-generales/public');
        if (response.ok) {
          const data = await response.json();
          if (data.PGNombrePlataforma) {
            setPlatformName(data.PGNombrePlataforma);
          }
          if (data.PGImagenLogin) {
            setLoginLogo(data.PGImagenLogin);
          }
        }
      } catch (err) {
        console.log('No se pudieron cargar los parámetros');
      }
    };
    fetchPlatformConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!forgotEmail) {
      setError('Ingresa tu email');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Recuperar Contraseña</h1>
          
          {forgotSent ? (
            <div className="auth-success">
              <p>📧 Si el email existe en nuestro sistema, recibirás un enlace de recuperación.</p>
              <p>Revisa tu bandeja de entrada (y spam).</p>
              <button 
                className="auth-link"
                onClick={() => {
                  setShowForgot(false);
                  setForgotSent(false);
                  setForgotEmail('');
                }}
              >
                ← Volver al Login
              </button>
            </div>
          ) : (
            <>
              <p className="auth-subtitle">Ingresa tu email para recibir un enlace de recuperación</p>
              
              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label htmlFor="forgot-email">Email</label>
                  <input
                    type="email"
                    id="forgot-email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading} className="auth-button">
                  {isLoading ? 'Enviando...' : 'Enviar Enlace'}
                </button>
              </form>

              <button 
                className="auth-link"
                onClick={() => {
                  setShowForgot(false);
                  setError('');
                }}
              >
                ← Volver al Login
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-content">
          <div className="auth-form-section">
            <h1>Iniciar Sesión</h1>
            <h2>{platformName}</h2>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  required
                />
              </div>

              <button type="submit" disabled={isLoading} className="auth-button">
                {isLoading ? 'Iniciando...' : 'Entrar'}
              </button>
            </form>

            <button 
              className="auth-link"
              onClick={() => setShowForgot(true)}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {loginLogo && (
            <div className="auth-logo-section">
              <img src={loginLogo} alt="Logo" className="auth-logo" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
