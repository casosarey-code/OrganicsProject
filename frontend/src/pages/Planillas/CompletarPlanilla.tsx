import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { planillasApi } from '../../api';
import { Planilla } from '../../types';
import FileUpload from '../../components/FileUpload';
import './CompletarPlanilla.css';

interface ComposicionInfo {
  producto: string;
  cantidad: number;
  componente: string;
  suma: number;
}

// Composición tiempo real v2
export default function CompletarPlanilla() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [composicionesInfo, setComposicionesInfo] = useState<ComposicionInfo[]>([]);

  useEffect(() => {
    if (id) fetchPlanilla();
  }, [id]);

  // Calcular composiciones cuando cambia la planilla
  useEffect(() => {
    if (planilla && planilla.detalles) {
      calcularComposiciones();
    }
  }, [planilla]);

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

  // Cuando planilla cambia, calcular composiciones y recalcular valores iniciales
  useEffect(() => {
    if (planilla && planilla.detalles) {
      calcularComposiciones();
      // Recalcular valores iniciales si no están calculados
      let needsRecalc = false;
      const detallesConCalculos = (planilla.detalles || []).map((d: any) => {
        const { subtotal, valor, final } = calcularValoresAuto(d);
        // Verificar si necesita recálculo
        if (d.PDCantSubtotal !== subtotal || d.PDCantFinal !== final) {
          needsRecalc = true;
        }
        return {
          ...d,
          PDCantSubtotal: subtotal,
          PDCantValor: valor,
          PDCantFinal: final,
        };
      });
      if (needsRecalc) {
        setPlanilla({ ...planilla, detalles: detallesConCalculos });
      }
    }
  }, [planilla]);

  // Función helper para calcular valores automáticos
  const calcularValoresAuto = (detalle: any) => {
    const inicial = Number(detalle.PDCantInicial) || 0;
    const compra = Number(detalle.PDCantCompra) || 0;
    const ajuste = Number(detalle.PDCantAjuste) || 0;
    const venta = Number(detalle.PDCantVenta) || 0;
    const valorUnitario = Number(detalle.valorEmpresa) || 0;
    
    // Subtotal = Inicial + Compras - Ajustes
    const subtotal = inicial + compra - ajuste;
    
    // Valor = Venta * Precio Unitario
    const valor = venta * valorUnitario;
    
    // Final = Subtotal - Venta
    const final = subtotal - venta;
    
    return { subtotal, valor, final };
  };

  const handleDetalleChange = (index: number, field: string, value: number) => {
    if (!planilla) return;
    const detalles = [...(planilla.detalles || [])];
    const detalle: any = { ...detalles[index] };
    detalle[field] = value;
    
    // Recalcular valores automáticos si cambia algún campo relevante
    if (['PDCantInicial', 'PDCantCompra', 'PDCantAjuste', 'PDCantVenta'].includes(field)) {
      const { subtotal, valor, final } = calcularValoresAuto(detalle);
      detalle.PDCantSubtotal = subtotal;
      detalle.PDCantValor = valor;
      detalle.PDCantFinal = final;
    }
    
    detalles[index] = detalle;
    setPlanilla({ ...planilla, detalles });
    
    // Recalcular composiciones cuando cambia la venta
    if (field === 'PDCantVenta') {
      setTimeout(() => calcularComposiciones(), 0);
    }
  };

  const handleOtroChange = (index: number, field: string, value: string | number) => {
    if (!planilla) return;
    const otros = [...(planilla.otros || [])];
    otros[index] = { ...otros[index], [field]: value };
    setPlanilla({ ...planilla, otros });
  };

  const addOtro = () => {
    if (!planilla) return;
    const nuevosOtros = [...(planilla.otros || []), { 
      POID: 0, 
      PlanillaID: planilla.PlanillaID, 
      PODescripcion: '', 
      POValor: 0, 
      POCategoria: 'Gastos', 
      POUrlEvidencia: '',
      POFechaReg: new Date().toISOString(),
      POUsuarioReg: ''
    }];
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

  // Función para calcular composiciones en tiempo real
  const calcularComposiciones = async () => {
    if (!planilla || !planilla.detalles) return;
    
    try {
      const token = localStorage.getItem('token');
      // Obtener todas las composiciones
      const res = await fetch('/api/productos/composicion', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const composiciones = await res.json();
      
      const info: ComposicionInfo[] = [];
      
      // Para cada detalle, calcular cuánto suma al componente
      for (const detalle of planilla.detalles) {
        const productoId = detalle.PDProducto;
        const venta = Number(detalle.PDCantVenta) || 0;
        
        // Buscar composiciones de este producto
        const comps = Array.isArray(composiciones) 
          ? composiciones.filter((c: any) => c.PCProducto === productoId)
          : [];
        
        for (const comp of comps) {
          const suma = venta * comp.PCCantidad;
          info.push({
            producto: detalle.producto?.ProductoNombre || `ID: ${productoId}`,
            cantidad: venta,
            componente: comp.componente?.ProductoNombre || `ID: ${comp.PCComponente}`,
            suma: suma,
          });
        }
      }
      
      setComposicionesInfo(info);
    } catch (err) {
      console.error('Error al calcular composiciones:', err);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString();
  const parseNumber = (str: string) => parseInt(str.replace(/\./g, '')) || 0;

  const calcularTotales = () => {
    if (!planilla) return { totalBruto: 0, efectivo: 0, bancos: 0, total: 0 };
    // Filtrar productos Solo Contabilidad para no incluirlos en los totales
    const detallesFiltrados = (planilla.detalles || []).filter((d: any) => !d.producto?.ProductoSoloContabilidad);
    const totalBruto = detallesFiltrados.reduce((sum, d) => sum + (Number(d.PDCantValor) || 0), 0);
    const otros = planilla.otros || [];
    const otrosGastos = otros.filter((o) => ['Gastos', 'Compras', 'Turnos', 'Memorias'].includes(o.POCategoria)).reduce((sum, o) => sum + (Number(o.POValor) || 0), 0);
    const otrosBancos = otros.filter((o) => ['Bold', 'Nequi', 'Daviplata', 'QR', 'Datafono'].includes(o.POCategoria)).reduce((sum, o) => sum + (Number(o.POValor) || 0), 0);
    return { totalBruto, efectivo: totalBruto - otrosBancos, bancos: otrosBancos, total: totalBruto - otrosGastos };
  };

  const { totalBruto, efectivo, bancos, total } = calcularTotales();

  // Guardar sin cambiar estado (para auto-guardado)
  const handleSave = async () => {
    if (!planilla) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const updateData = {
        PlanillaEstado: 'A', // Estado A = en proceso
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
      const respuesta = await planillasApi.update(planilla.PlanillaID, updateData);
      setPlanilla(respuesta);
      setSuccess('Guardado correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

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
      const respuesta = await planillasApi.update(planilla.PlanillaID, updateData);
      // Actualizar la planilla con los valores que el backend calculó (con Solo Contabilidad filtrado)
      setPlanilla(respuesta);
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
          <button onClick={handleSave} disabled={isSaving} className="btn btn-secondary">{isSaving ? 'Guardando...' : 'Guardar'}</button>
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
            {(planilla.detalles || []).map((detalle, index) => {
              const soloContabilidad = detalle.producto?.ProductoSoloContabilidad;
              return (
              <tr key={index}>
                <td>{detalle.producto?.ProductoNombre || 'Producto'}{soloContabilidad && <span style={{color:'#666', fontSize:'0.8em', marginLeft:'5px'}}>(Solo Contabilidad)</span>}</td>
                <td><input type="tel" disabled={soloContabilidad} value={formatNumber(Number(detalle.PDCantInicial) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantInicial', parseNumber(e.target.value))} style={soloContabilidad ? {background:'#f0f0f0', color:'#999'} : {}} /></td>
                <td><input type="tel" disabled={soloContabilidad} value={formatNumber(Number(detalle.PDCantCompra) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantCompra', parseNumber(e.target.value))} style={soloContabilidad ? {background:'#f0f0f0', color:'#999'} : {}} /></td>
                <td><input type="tel" disabled={soloContabilidad} value={formatNumber(Number(detalle.PDCantAjuste) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantAjuste', parseNumber(e.target.value))} style={soloContabilidad ? {background:'#f0f0f0', color:'#999'} : {}} /></td>
                <td style={{background:'#f5f5f5', color:'#666', fontWeight:'bold'}}>{formatNumber(Number(detalle.PDCantSubtotal) || 0)}</td>
                <td><input type="tel" value={formatNumber(Number(detalle.PDCantVenta) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantVenta', parseNumber(e.target.value))} /></td>
                <td><input type="tel" value={formatNumber(Number(detalle.PDCantValor) || 0)} onChange={(e) => handleDetalleChange(index, 'PDCantValor', parseNumber(e.target.value))} placeholder={soloContabilidad ? "Ingrese valor" : ""} style={soloContabilidad ? {background:'#fffbe6'} : {}} title={soloContabilidad ? "Solo Contabilidad - Ingrese el valor manualmente" : ""} /></td>
                <td style={{background:'#f5f5f5', color:'#666', fontWeight:'bold'}}>{soloContabilidad ? '-' : formatNumber(Number(detalle.PDCantFinal) || 0)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
        <div className="total-bruto"><strong>Total de venta bruta: </strong> ${formatNumber(Number(totalBruto))}</div>
        <div className="total-bruto-ayuda"><strong>Usuario:</strong> Completa los campos del listado según tus ventas y inventarios</div>
      </div>

      {/* Sección de Composiciones en tiempo real */}
      {composicionesInfo.length > 0 && (
        <div className="form-section" style={{ background: '#e8f5e9', border: '1px solid #4caf50' }}>
          <h3>📦 Resumen de Composiciones (Suma a inventario)</h3>
          <table className="data-table">
            <thead>
              <tr><th>Producto Vendido</th><th>Cantidad</th><th>Suma a</th><th>Total</th></tr>
            </thead>
            <tbody>
              {composicionesInfo.map((comp, idx) => (
                <tr key={idx}>
                  <td>{comp.producto}</td>
                  <td>{comp.cantidad}</td>
                  <td><strong>{comp.componente}</strong></td>
                  <td style={{ color: '#2e7d32', fontWeight: 'bold' }}>+{comp.suma.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
