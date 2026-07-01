import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { planillasApi, empresasApi, productosApi } from '../../api';
import { CreatePlanillaDTO, Empresa, Producto, Planilla } from '../../types';

export default function FormularioPlanilla() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Función para calcular fecha de vencimiento (3 días después)
  const getFechaVencimiento = (fechaPlanilla: string) => {
    if (!fechaPlanilla) return '';
    const fecha = new Date(fechaPlanilla);
    fecha.setDate(fecha.getDate() + 3);
    return fecha.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<CreatePlanillaDTO>({
    PlanillaFecha: new Date().toISOString().split('T')[0],
    PlanillaFechaVencimiento: getFechaVencimiento(new Date().toISOString().split('T')[0]),
    PlanillaPuntoVenta: 0,
    PlanillaVentaBruta: 0,
    PlanillaVentaEfectivo: 0,
    PlanillaVentaBancos: 0,
    PlanillaVentaNeta: 0,
    PlanillaVentaBOLD: 0,
    PlanillaVentaNEQUI: 0,
    PlanillaVentaDAVIPLATA: 0,
    PlanillaVentaQR: 0,
    detalles: [],
    otros: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empresasData, productosData] = await Promise.all([
          empresasApi.getAll({ estado: 'A' }),
          productosApi.getAll({ activo: true }),
        ]);
        setEmpresas(empresasData);
        setProductos(productosData);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (isEditing && id) {
      const fetchPlanilla = async () => {
        setIsLoading(true);
        try {
          const planilla: Planilla = await planillasApi.getById(parseInt(id));
          setFormData({
            PlanillaPuntoVenta: planilla.PlanillaPuntoVenta,
            PlanillaFecha: planilla.PlanillaFecha?.split('T')[0] || '',
            PlanillaFechaVencimiento: planilla.PlanillaFechaVencimiento?.split('T')[0] || '',
            PlanillaVentaBruta: planilla.PlanillaVentaBruta || 0,
            PlanillaVentaEfectivo: planilla.PlanillaVentaEfectivo || 0,
            PlanillaVentaBancos: planilla.PlanillaVentaBancos || 0,
            PlanillaVentaNeta: planilla.PlanillaVentaNeta || 0,
            PlanillaVentaBOLD: planilla.PlanillaVentaBOLD || 0,
            PlanillaVentaNEQUI: planilla.PlanillaVentaNEQUI || 0,
            PlanillaVentaDAVIPLATA: planilla.PlanillaVentaDAVIPLATA || 0,
            PlanillaVentaQR: planilla.PlanillaVentaQR || 0,
            detalles: planilla.detalles?.map((d) => ({
              PDProducto: d.PDProducto,
              PDCantInicial: d.PDCantInicial,
              PDCantCompra: d.PDCantCompra,
              PDCantAjuste: d.PDCantAjuste,
              PDCantVenta: d.PDCantVenta,
              PDCantValor: d.PDCantValor,
            })),
            otros: planilla.otros?.map((o) => ({
              PODescripcion: o.PODescripcion,
              POValor: o.POValor,
              POCategoria: o.POCategoria,
              POUrlEvidencia: o.POUrlEvidencia,
            })),
          });
        } catch (err: any) {
          setError(err.response?.data?.error || 'Error al cargar planilla');
        } finally {
          setIsLoading(false);
        }
      };

      fetchPlanilla();
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Para campos de fecha, mantener como string
    if (type === 'date') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? 0 : parseInt(value) || 0,
      }));
    }
  };

  // Actualizar fecha de vencimiento cuando cambie la fecha de planilla (solo en creación)
  useEffect(() => {
    if (!isEditing && formData.PlanillaFecha) {
      setFormData((prev) => ({
        ...prev,
        PlanillaFechaVencimiento: getFechaVencimiento(prev.PlanillaFecha || ''),
      }));
    }
  }, [formData.PlanillaFecha, isEditing]);

  const handleDetalleChange = (index: number, field: string, value: number) => {
    setFormData((prev) => {
      const detalles = [...(prev.detalles || [])];
      detalles[index] = { ...detalles[index], [field]: value };
      return { ...prev, detalles };
    });
  };

  const addDetalle = () => {
    setFormData((prev) => ({
      ...prev,
      detalles: [...(prev.detalles || []), { PDProducto: 0, PDCantInicial: 0, PDCantCompra: 0, PDCantAjuste: 0, PDCantVenta: 0, PDCantValor: 0 }],
    }));
  };

  const removeDetalle = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      detalles: prev.detalles?.filter((_, i) => i !== index),
    }));
  };

  const handleOtroChange = (index: number, field: string, value: string | number) => {
    setFormData((prev) => {
      const otros = [...(prev.otros || [])];
      otros[index] = { ...otros[index], [field]: value };
      return { ...prev, otros };
    });
  };

  const addOtro = () => {
    setFormData((prev) => ({
      ...prev,
      otros: [...(prev.otros || []), { PODescripcion: '', POValor: 0, POCategoria: 'Gastos' }],
    }));
  };

  const removeOtro = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      otros: prev.otros?.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isEditing && id) {
        await planillasApi.update(parseInt(id), formData);
        setSuccess('Planilla actualizada correctamente');
      } else {
        await planillasApi.create(formData);
        setSuccess('Planilla creada correctamente');
      }
      setTimeout(() => navigate('/planillas'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar planilla');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isEditing) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{isEditing ? 'Editar Planilla' : 'Nueva Planilla'}</h1>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="planilla-form">
        <div className="form-section">
          <h3>Información General</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha de Planilla *</label>
              <input
                type="date"
                name="PlanillaFecha"
                value={formData.PlanillaFecha || ''}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha de Vencimiento</label>
              <input
                type="date"
                name="PlanillaFechaVencimiento"
                value={formData.PlanillaFechaVencimiento || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Punto de Venta *</label>
              <select
                name="PlanillaPuntoVenta"
                value={formData.PlanillaPuntoVenta}
                onChange={handleChange}
                required
              >
                <option value={0}>Seleccionar...</option>
                {empresas.map((emp) => (
                  <option key={emp.EmpresaID} value={emp.EmpresaID}>
                    {emp.EmpresaNombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sección oculta - campos para analítica */}
        {/* 
        <div className="form-section">
          <h3>Ventas</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Venta Bruta</label>
              <input
                type="number"
                name="PlanillaVentaBruta"
                value={formData.PlanillaVentaBruta || ''}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Venta Efectivo</label>
              <input
                type="number"
                name="PlanillaVentaEfectivo"
                value={formData.PlanillaVentaEfectivo || ''}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Venta Bancos</label>
              <input
                type="number"
                name="PlanillaVentaBancos"
                value={formData.PlanillaVentaBancos || ''}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Venta Neta</label>
              <input
                type="number"
                name="PlanillaVentaNeta"
                value={formData.PlanillaVentaNeta || ''}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Venta BOLD</label>
              <input
                type="number"
                name="PlanillaVentaBOLD"
                value={formData.PlanillaVentaBOLD || ''}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Venta NEQUI</label>
              <input
                type="number"
                name="PlanillaVentaNEQUI"
                value={formData.PlanillaVentaNEQUI || ''}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Venta Daviplata</label>
              <input
                type="number"
                name="PlanillaVentaDAVIPLATA"
                value={formData.PlanillaVentaDAVIPLATA || ''}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Venta QR</label>
              <input
                type="number"
                name="PlanillaVentaQR"
                value={formData.PlanillaVentaQR || ''}
                onChange={handleChange}
                min="0"
              />
            </div>
          </div>
        </div>
        */}

        {/* Oculto: Sección de Productos */}
        {/*
        <div className="form-section">
          <div className="section-header">
            <h3>Productos</h3>
            <button type="button" onClick={addDetalle} className="btn btn-sm btn-secondary">
              + Agregar Producto
            </button>
          </div>

          {formData.detalles && formData.detalles.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Inicial</th>
                  <th>Compra</th>
                  <th>Ajuste</th>
                  <th>Venta</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.detalles.map((detalle, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={detalle.PDProducto}
                        onChange={(e) => handleDetalleChange(index, 'PDProducto', parseInt(e.target.value))}
                        required
                      >
                        <option value={0}>Seleccionar...</option>
                        {productos.map((prod) => (
                          <option key={prod.ProductoID} value={prod.ProductoID}>
                            {prod.ProductoNombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={detalle.PDCantInicial || ''}
                        onChange={(e) => handleDetalleChange(index, 'PDCantInicial', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={detalle.PDCantCompra || ''}
                        onChange={(e) => handleDetalleChange(index, 'PDCantCompra', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={detalle.PDCantAjuste || ''}
                        onChange={(e) => handleDetalleChange(index, 'PDCantAjuste', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={detalle.PDCantVenta || ''}
                        onChange={(e) => handleDetalleChange(index, 'PDCantVenta', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={detalle.PDCantValor || ''}
                        onChange={(e) => handleDetalleChange(index, 'PDCantValor', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </td>
                    <td>
                      <button type="button" onClick={() => removeDetalle(index)} className="btn btn-sm btn-danger">
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        */}

        {/* Oculto: Sección de Otros */}
        {/*
        <div className="form-section">
          <div className="section-header">
            <h3>Otros (Gastos/Ingresos)</h3>
            <button type="button" onClick={addOtro} className="btn btn-sm btn-secondary">
              + Agregar
            </button>
          </div>

          {formData.otros && formData.otros.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.otros.map((otro, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={otro.PODescripcion}
                        onChange={(e) => handleOtroChange(index, 'PODescripcion', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <select
                        value={otro.POCategoria}
                        onChange={(e) => handleOtroChange(index, 'POCategoria', e.target.value)}
                      >
                        <option value="Compras">Compras</option>
                        <option value="Gastos">Gastos</option>
                        <option value="Turnos">Turnos</option>
                        <option value="Bold">Bold</option>
                        <option value="Nequi">Nequi</option>
                        <option value="Daviplata">Daviplata</option>
                        <option value="QR">QR</option>
                        <option value="Memorias">Memorias</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={otro.POValor || ''}
                        onChange={(e) => handleOtroChange(index, 'POValor', parseInt(e.target.value) || 0)}
                        min="0"
                        required
                      />
                    </td>
                    <td>
                      <button type="button" onClick={() => removeOtro(index)} className="btn btn-sm btn-danger">
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        */}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/planillas')} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary">
            {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Planilla'}
          </button>
        </div>
      </form>
    </div>
  );
}
