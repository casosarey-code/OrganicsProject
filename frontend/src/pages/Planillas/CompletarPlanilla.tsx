import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { planillasApi } from '../../api';
import { Planilla } from '../../types';
import FileUpload from '../../components/FileUpload';
import './CompletarPlanilla.css';

export default function CompletarPlanilla() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) fetchPlanilla();
  }, [id]);

  const fetchPlanilla = async () => {
    setIsLoading(true);
    try {
      const data = await planillasApi.getById(parseInt(id!));
      setPlanilla(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar planilla');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetalleChange = (index: number, field: string, value: number) => {
    if (!planilla) return;
    const detalles = [...(planilla.detalles || [])];
    const detalle: any = { ...detalles[index] };
    detalle[field] = value;
    detalles[index] = detalle;
    setPlanilla({ ...planilla, detalles });
  };

  const handleOtroChange = (index: number, field: string, value: string | number) => {
    if (!planilla) return;
    const otros = [...(planilla.otros || [])];
    otros[index] = { ...otros[index], [field]: value };
    setPlanilla({ ...planilla, otros });
  };

  const addOtro = () => {
    if (!planilla) return;
    const nuevosOtros = [...(planilla.otros || []), { POID: 0, PlanillaID: planilla.PlanillaID, PODescripcion: '', POValor: 0, POCategoria: 'Gastos', POUrlEvidencia: '' }];
    setPlanilla({ ...planilla, otros: nuevosOtros });
  };

  const removeOtro = (index: number) => {
    if (!planilla) return;
    const otros = [...(planilla.otros || [])];
    otros.splice(index, 1);
    setPlanilla({ ...planilla, otros });
  };

  const handleFileUpload = async (index: number, file: File) => {
    try {
      const { url } = await planillasApi.uploadEvidencia(file);
      handleOtroChange(index, 'POUrlEvidencia', url);
      alert(`Archivo ${file.name} cargado`);
    } catch (err) {
      console.error('Error al subir archivo:', err);
      alert('Error al subir archivo');
    }
  };

  const formatNumber = (num: number) => num.toLocaleString();
  const parseNumber = (str: string) => parseInt(str.replace(/\./g, '')) || 0;

  const calcularTotales = () => {
    if (!planilla) return { totalBruto: 0, efectivo: 0, bancos: 0, total: 0 };
    const totalBruto = (planilla.detalles || []).reduce((sum, d) => sum + (Number(d.PDCantValor) || 0), 0);
    const otros = planilla.otros || [];
    const otrosGastos = otros.filter((o) => ['Gastos', 'Compras', 'Turnos', 'Memorias'].includes(o.POCategoria)).reduce((sum, o) => sum + (Number(o.POValor) || 0), 0);
    const otrosBancos = otros.filter((o) => ['Bold', 'Nequi', 'Daviplata', 'QR', 'Datafono'].includes(o.POCategoria)).reduce((sum, o) => sum + (Number(o.POValor) || 0), 0);
    return { totalBruto, efectivo: totalBruto - otrosBancos, bancos: otrosBancos, total: totalBruto - otrosGastos };
  };

  const { totalBruto, efectivo, bancos, total } = calcularTotales();

  const handleSubmit = async () => {
        if (!planilla) return;
        setIsSaving(true);
        setError('');
        setSuccess('');
      
        // Calcular si hay errores
        let tieneErrores = false;
        (planilla.detalles || []).forEach((d: any) => {
          const subtotalCalc = (Number(d.PDCantInicial) || 0) + (Number(d.PDCantCompra) || 0) - (Number(d.PDCantAjuste) || 0);
          const finalCalc = subtotalCalc - (Number(d.PDCantVenta) || 0);
          if (subtotalCalc !== Number(d.PDCantSubtotal) || finalCalc !== Number(d.PDCantFinal)) {
            tieneErrores = true;
          }
        });
      
        const nuevoEstado = tieneErrores ? 'B' : 'C';
      
        try {
          const updateData = {
        PlanillaVentaBruta: Number(totalBruto) || 0,
        PlanillaVentaNeta: Number(total) || 0,
        PlanillaVentaEfectivo: Number(efectivo) || 0,
        PlanillaVentaBancos: Number(bancos) || 0,
        PlanillaEstado: nuevoEstado,
        detalles: (planilla.detalles || []).map((d: any) => ({
          PDProducto: Number(d.PDProducto),
          PDCantInicial: Number(d.PDCantInicial) || 0,
          PDCantCompra: Number(d.PDCantCompra) || 0,
          PDCantAjuste: Number(d.PDCantAjuste) || 0,
          PDCantSubtotal: Number(d.PDCantSubtotal) || 0,
          PDCantVenta: Number(d.PDCantVenta) || 0,
          PDCantValor: Number(d.PDCantValor) || 0,
          PDCantFinal: Number(d.PDCantFinal) || 0,
        })),
        otros: (planilla.otros || []).map((o: any) => ({
          PODescripcion: o.PODescripcion || '',
          POValor: Number(o.POValor) || 0,
          POCategoria: o.POCategoria || 'Gastos',
          POUrlEvidencia: o.POUrlEvidencia || '',
        })),
      };
      await planillasApi.update(planilla.PlanillaID, updateData);
      alert('Enviado con Éxito');
      navigate('/');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="loading">Cargando...</div>;
  if (!planilla) return <div className="no-data">Planilla no encontrada</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h1>Completar Planilla</h1>
          <span className="planilla-info">{planilla.puntoVenta?.EmpresaNombre} - {new Date(planilla.PlanillaFecha).toLocaleDateString()}</span>
        </div>
        <div className="header-actions">
          <button onClick={handleSubmit} disabled={isSaving} className="btn btn-primary">{isSaving ? 'Enviando...' : 'Enviar Planilla'}</button>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-section">
        <h3>Detalles del Inventario</h3>
        <table className="data-table">
          <thead>
            <tr><th>Producto</th><th>N. Inicial</th><th>Compras</th><th>Ajustes</th><th>Subtotal</th><th>Venta</th><th>Valor</th><th>N. Final</th></tr>
          </thead>
          <tbody>
            {(planilla.detalles || []).map((detalle, index) => (
              <tr key={index}>
                <td>{detalle.producto?.ProductoNombre || 'Producto'}</td>
                <td><input type="tel"  value={formatNumber(Number(detalle.PDCantInicial) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantInicial', parseNumber(e.target.value))} /></td>
                <td><input type="tel"  value={formatNumber(Number(detalle.PDCantCompra) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantCompra', parseNumber(e.target.value))} /></td>
                <td><input type="tel"  value={formatNumber(Number(detalle.PDCantAjuste) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantAjuste', parseNumber(e.target.value))} /></td>
                <td><input type="tel"  value={formatNumber(Number(detalle.PDCantSubtotal) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantSubtotal', parseNumber(e.target.value))} /></td>
                <td><input type="tel"  value={formatNumber(Number(detalle.PDCantVenta) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantVenta', parseNumber(e.target.value))} /></td>
                <td><input type="tel"  value={formatNumber(Number(detalle.PDCantValor) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantValor', parseNumber(e.target.value))} /></td>
                <td><input type="tel"  value={formatNumber(Number(detalle.PDCantFinal) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantFinal', parseNumber(e.target.value))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="total-bruto"><strong>Total de venta bruta: </strong> ${formatNumber(Number(totalBruto))}</div>
        <div className="total-bruto-ayuda"><strong>Usuario:</strong> Completa los campos del listado según tus ventas y inventarios</div>
      </div>

      <div className="form-section">
        <div className="section-header"><h3>Gastos Extra / Otros</h3><button onClick={addOtro} className="btn btn-sm btn-secondary">+ Agregar</button></div>
        {(planilla.otros || []).length > 0 ? (
          <table className="data-table">
            <thead><tr><th>Descripcion</th><th>Valor ($)</th><th>Categoria</th><th>Evidencia</th><th></th></tr></thead>
            <tbody>
              {(planilla.otros || []).map((otro, index) => (
                <tr key={index}>
                  <td><input type="tel" value={otro.PODescripcion} onChange={(e) => handleOtroChange(index, 'PODescripcion', e.target.value)} placeholder="Descripcion" /></td>
                  <td><input type="tel"  value={formatNumber(Number(otro.POValor) || 0)} onChange={(e) => handleOtroChange(index, 'POValor', parseNumber(e.target.value))} /></td>
                  <td>
                    <select value={otro.POCategoria} onChange={(e) => handleOtroChange(index, 'POCategoria', e.target.value)}>
                      <option value="Gastos">Gastos</option><option value="Compras">Compras</option><option value="Turnos">Turnos</option>
                      <option value="Bold">Bold</option><option value="Nequi">Nequi</option><option value="Daviplata">Daviplata</option>
                      <option value="QR">QR</option><option value="Datafono">Datafono</option><option value="Memorias">Memorias</option>
                    </select>
                  </td>
                  <td style={{ minWidth: '150px' }}>
                    <FileUpload 
                      onFileSelect={(file) => handleFileUpload(index, file)}
                      accept="image/*,.pdf"
                      label="Subir evidencia"
                      currentFile={otro.POUrlEvidencia}
                    />
                  </td>
                  <td><button onClick={() => removeOtro(index)} className="btn btn-sm btn-danger">X</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="no-data">No hay gastos registrados</p>}
      </div>

      <div className="resumen-section">
        <div className="resumen-nota"><strong>Usuario:</strong> Recuerda que este reporte debe ser enviado a Diario</div>
        <div className="resumen-totales">
          <table className="totales-table"><tbody>
            <tr><td>Total</td><td className="value">${formatNumber(Number(total))}</td></tr>
            <tr><td>Efectivo</td><td className="value">${formatNumber(Number(efectivo))}</td></tr>
            <tr><td>Bancos</td><td className="value">${formatNumber(Number(bancos))}</td></tr>
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
