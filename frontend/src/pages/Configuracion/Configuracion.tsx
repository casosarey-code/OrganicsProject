import { Link } from 'react-router-dom';
import './Configuracion.css';

export default function Configuracion() {
  const configItems = [
    {
      title: 'Empresas',
      description: 'Gestiona los puntos de venta y empresas del sistema',
      link: '/config/empresas',
      icon: '🏢',
    },
    {
      title: 'Productos',
      description: 'Administra el catálogo de productos',
      link: '/config/productos',
      icon: '📦',
    },
    {
      title: 'Usuarios',
      description: 'Gestiona los usuarios y sus roles',
      link: '/config/usuarios',
      icon: '👥',
    },
    {
      title: 'Roles y Permisos',
      description: 'Configura roles y permisos del sistema',
      link: '/config/roles',
      icon: '🔐',
    },
    {
      title: 'Gestionar Permisos',
      description: 'Asigna permisos a cada rol',
      link: '/config/permisos',
      icon: '⚡',
    },
    {
      title: 'Parámetros Generales',
      description: 'Configura el nombre e imágenes de la plataforma',
      link: '/config/general',
      icon: '⚙️',
    },
    {
      title: 'Configuración de Email',
      description: 'Configura el servidor SMTP para envío de correos',
      link: '/config/email',
      icon: '📧',
    },
    {
      title: 'Plantillas de Email',
      description: 'Administra las plantillas de correo',
      link: '/config/plantillas-email',
      icon: '📝',
    },
    {
      title: 'Historial de Correos',
      description: 'Ver el historial de correos enviados',
      link: '/config/historial-correos',
      icon: '📬',
    },
    {
      title: 'Importar Productos',
      description: 'Importa productos desde archivo CSV',
      link: '/config/importar-productos',
      icon: '📥',
    },
    {
      title: 'Importar Productos por Empresa',
      description: 'Asocia productos a una empresa desde CSV',
      link: '/config/importar-empresa-productos',
      icon: '🏪',
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Configuración</h1>
      </div>
      <div className="config-grid">
        {configItems.map((item) => (
          <Link to={item.link} key={item.link} className="config-card">
            <span className="config-icon">{item.icon}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
