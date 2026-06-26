import { useState, useRef } from 'react';
import api from '../../api/axios';
import './Importar.css';

interface ProductoImport {
  ProductoNombre: string;
  ProductoCodigo?: string;
  ProductoPrecio?: number;
  ProductoStock?: number;
  ProductoActivo?: boolean;
}

interface Error {
  fila: number;
  error: string;
}

export default function ImportarProductos() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [datos, setDatos] = useState<ProductoImport[]>([]);
  const [errores, setErrores] = useState<Error[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [resultado, setResultado] = useState<{ creados: number; actualizados: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivo(file);
    setResultado(null);
    setErrores([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setErrores([{ fila: 0, error: 'El archivo debe tener al menos una fila de encabezado y una fila de datos' }]);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Validar encabezados requeridos
      if (!headers.includes('ProductoNombre')) {
        setErrores([{ fila: 0, error: 'El archivo debe tener una columna "ProductoNombre"' }]);
        return;
      }

      const productos: ProductoImport[] = [];
      const parsingErrors: Error[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        const producto: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim().replace(/"/g, '') || '';
          
          switch (header) {
            case 'ProductoNombre':
              producto.ProductoNombre = value;
              break;
            case 'ProductoCodigo':
              producto.ProductoCodigo = value || undefined;
              break;
            case 'ProductoPrecio':
              producto.ProductoPrecio = value ? parseFloat(value) : undefined;
              break;
            case 'ProductoStock':
              producto.ProductoStock = value ? parseInt(value) : undefined;
              break;
            case 'ProductoActivo':
              producto.ProductoActivo = value.toLowerCase() === 'true' || value === '1';
              break;
          }
        });

        if (!producto.ProductoNombre) {
          parsingErrors.push({ fila: i + 1, error: 'ProductoNombre es requerido' });
        } else {
          productos.push(producto);
        }
      }

      setDatos(productos);
      setErrores(parsingErrors);
    };

    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  };

  const handleImport = async () => {
    if (datos.length === 0) return;

    setIsImporting(true);
    setResultado(null);

    try {
      const response = await api.post('/productos/importar', { productos: datos });
      setResultado({
        creados: response.data.creados,
        actualizados: response.data.actualizados
      });
      setErrores(response.data.errores || []);
      setDatos([]);
      setArchivo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      setErrores([{ fila: 0, error: error.response?.data?.error || 'Error al importar productos' }]);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/productos/importar/plantilla', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'plantilla_productos.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error descargando plantilla:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Importar Productos</h1>
        <button onClick={handleDownloadTemplate} className="btn btn-secondary">
          Descargar Plantilla CSV
        </button>
      </div>

      {resultado && (
        <div className="success-message">
          Importación completada: {resultado.creados} productos creados, {resultado.actualizados} actualizados
        </div>
      )}

      {errores.length > 0 && !resultado && (
        <div className="error-summary">
          <h4>Errores encontrados:</h4>
          <ul>
            {errores.slice(0, 10).map((err, index) => (
              <li key={index}>
                {err.fila > 0 ? `Fila ${err.fila}: ` : ''}{err.error}
              </li>
            ))}
            {errores.length > 10 && (
              <li>... y {errores.length - 10} errores más</li>
            )}
          </ul>
        </div>
      )}

      <div className="form-section">
        <h3>Seleccionar Archivo CSV</h3>
        <p className="help-text">
          El archivo debe tener columnas: ProductoNombre (requerido), ProductoCodigo, ProductoPrecio, ProductoStock, ProductoActivo
        </p>
        
        <div className="file-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            id="file-input"
          />
          {archivo && (
            <div className="file-info">
              <strong>Archivo:</strong> {archivo.name} ({datos.length} productos detectados)
            </div>
          )}
        </div>
      </div>

      {datos.length > 0 && (
        <div className="form-section">
          <h3>Vista Previa ({datos.length} productos)</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Código</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Activo</th>
                </tr>
              </thead>
              <tbody>
                {datos.slice(0, 20).map((producto, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{producto.ProductoNombre}</td>
                    <td>{producto.ProductoCodigo || '-'}</td>
                    <td>{producto.ProductoPrecio?.toLocaleString() || '-'}</td>
                    <td>{producto.ProductoStock ?? '-'}</td>
                    <td>{producto.ProductoActivo !== false ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {datos.length > 20 && (
              <p className="show-more">Mostrando los primeros 20 de {datos.length} productos</p>
            )}
          </div>

          <div className="form-actions">
            <button 
              onClick={handleImport} 
              className="btn btn-primary"
              disabled={isImporting || datos.length === 0}
            >
              {isImporting ? 'Importando...' : `Importar ${datos.length} Productos`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
