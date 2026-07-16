import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { planillasApi } from '../../api';
import { Planilla } from '../../types';
import FileUpload from '../../components/FileUpload';
import './CompletarPlanilla.css';

interface Composicion {
  PCID: number;
  PCProducto: number; // Producto padre (POLLO)
  PCComponente: number; // Componente (POLLO 1/2)
  PCCantidad: number; // Cuántas unidades del componente = 1 del padre
  producto?: { ProductoID: number; ProductoNombre: string };
  componente?: { ProductoID: number; ProductoNombre: string };
}

export default function CompletarPlanilla() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [composiciones, setComposiciones] = useState<Composicion[]>([]);
  
  // Estado para valores de input como strings (para permitir escribir decimales)
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  
  // Bandera para evitar loop infinito
  const [isCalculated, setIsCalculated] = useState(false);

  useEffect(() => {
    if (id) fetchPlanilla();
  }, [id]);

  // Función para cargar composiciones del backend
  const fetchComposiciones = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/productos/composicion', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Composiciones cargadas:', data);
        setComposiciones(data);
      }
    } catch (err) {
      console.error('Error al cargar composiciones:', err);
    }
  }, []);

  const fetchPlanilla = async () => {
    setIsLoading(true);
    setIsCalculated(false); // Resetear bandera
    try {
      const data = await planillasApi.getById(parseInt(id!));
      setPlanilla(data);
      // Cargar composiciones
      await fetchComposiciones();
      // Inicializar valores de input
      const initialValues: Record<string, string> = {};
      (data.detalles || []).forEach((d: any, idx: number) => {
        initialValues[`${idx}-PDCantInicial`] = String(d.PDCantInicial || 0);
        initialValues[`${idx}-PDCantCompra`] = String(d.PDCantCompra || 0);
        initialValues[`${idx}-PDCantAjuste`] = String(d.PDCantAjuste || 0);
        initialValues[`${idx}-PDCantVenta`] = String(d.PDCantVenta || 0);
        initialValues[`${idx}-PDCantValor`] = String(d.PDCantValor || 0);
      });
      setInputValues(initialValues);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar planilla');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para calcular el impacto de composiciones en el N. Final
  // Cuando se vende un COMPONENTE, afecta el inventario del PADRE
  const calcularImpactoComposiciones = useCallback((detalles: any[]): Map<number, number> => {
    const impacto = new Map<number, number>();
    
    // Para cada detalle vendido
    detalles.forEach((detalle) => {
      const venta = Number(detalle.PDCantVenta) || 0;
      if (venta <= 0) return;
      
      const productoId = Number(detalle.PDProducto);
      
      // Buscar composiciones donde este producto es COMPONENTE
      // PCComponente = el producto que se vende (POLLO 1/2)
      // PCProducto = el producto padre cuyo inventario se afecta (POLLO)
      const composicionesDondeEsComponente = composiciones.filter(c => c.PCComponente === productoId);
      
      composicionesDondeEsComponente.forEach(comp => {
        const padreId = comp.PCProducto;
        // Cuántas unidades del padre se "consumen" por cada venta del componente
        // PCCantidad indica cuánto del componente = 1 del padre
        // Ej: Si PCCantidad = 0.5, entonces 2 POLLO 1/2 = 1 POLLO
        const cantidadEquivalente = venta * comp.PCCantidad;
        
        // Restar del inventario del padre
        const impactoActual = impacto.get(padreId) || 0;
        impacto.set(padreId, impactoActual - cantidadEquivalente);
      });
    });
    
    return impacto;
  }, [composiciones]);

  // Calcular valores automáticos con composiciones
  const calcularValoresAuto = useCallback((detalle: any, impactoComposiciones: Map<number, number> = new Map()) => {
    const inicial = Number(detalle.PDCantInicial) || 0;
    const compra = Number(detalle.PDCantCompra) || 0;
    const ajuste = Number(detalle.PDCantAjuste) || 0;
    const venta = Number(detalle.PDCantVenta) || 0;
    const valorUnitario = Number(detalle.valorEmpresa) || 0;
    
    // Subtotal = Inicial + Compras - Ajustes
    const subtotal = inicial + compra - ajuste;
    
    // Valor = Venta * Precio Unitario
    const valor = venta * valorUnitario;
    
    // Final = Subtotal - Venta + impacto de composiciones
    const impactoPadre = impactoComposiciones.get(Number(detalle.PDProducto)) || 0;
    const final = subtotal - venta + impactoPadre;
    
    return { subtotal, valor, final, impactoPadre };
  }, []);

  // Cuando planilla o composiciones cambian, recalcular valores
  useEffect(() => {
    if (!planilla || !planilla.detalles) return;
    
    // Si hay composiciones, calcular impacto
    if (composiciones.length > 0) {
      const impactoComposiciones = calcularImpactoComposiciones(planilla.detalles);
      
      const detallesConCalculos = (planilla.detalles || []).map((d: any) => {
        const { subtotal, valor, final, impactoPadre } = calcularValoresAuto(d, impactoComposiciones);
        return {
          ...d,
          PDCantSubtotal: subtotal,
          PDCantValor: valor,
          PDCantFinal: final,
          _impactoPadre: impactoPadre,
        };
      });
      setPlanilla({ ...planilla, detalles: detallesConCalculos });
    } else {
      // Sin composiciones, solo calcular valores normales
      const detallesConCalculos = (planilla.detalles || []).map((d: any) => {
        const { subtotal, valor, final } = calcularValoresAuto(d, new Map());
        return {
          ...d,
          PDCantSubtotal: subtotal,
          PDCantValor: valor,
          PDCantFinal: final,
          _impactoPadre: 0,
        };
      });
      setPlanilla({ ...planilla, detalles: detallesConCalculos });
    }
  }, [planilla, composiciones]);

  // Manejar cambio de input (mantener como string mientras se escribe)
  const handleInputChange = (key: string, value: string) => {
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  // Manejar pérdida de foco (convertir a número y actualizar estado)
  const handleInputBlur = (index: number, field: string) => {
    if (!planilla) return;
    const key = `${index}-${field}`;
    const strValue = inputValues[key] || '0';
    const numValue = parseNumber(strValue);
    
    const detalles = [...(planilla.detalles || [])];
    detalles[index] = { ...detalles[index], [field]: numValue };
    
    // Recalcular valores automáticos si cambia algún campo relevante
    if (['PDCantInicial', 'PDCantCompra', 'PDCantAjuste', 'PDCantVenta'].includes(field)) {
      // IMPORTANTE: Recalcular impacto de TODOS los componentes (afecta al padre)
      const impactoComposiciones = calcularImpactoComposiciones(detalles);
      
      // Recalcular TODOS los detalles con el nuevo impacto (pasando el impacto calculado)
      const detallesRecalculados = detalles.map((d: any) => {
        const { subtotal, valor, final, impactoPadre } = calcularValoresAuto(d, impactoComposiciones);
        return {
          ...d,
          PDCantSubtotal: subtotal,
          PDCantValor: valor,
          PDCantFinal: final,
          _impactoPadre: impactoPadre,
        };
      });
      
      // Actualizar inputValues para campos calculados del detalle editado
      const detalleActualizado = detallesRecalculados[index];
      setInputValues(prev => ({ 
        ...prev, 
        [key]: formatNumber(numValue),
        [`${index}-PDCantSubtotal`]: formatNumber(detalleActualizado.PDCantSubtotal),
        [`${index}-PDCantValor`]: formatNumber(detalleActualizado.PDCantValor),
        [`${index}-PDCantFinal`]: formatNumber(detalleActualizado.PDCantFinal),
      }));
      
      setPlanilla({ ...planilla, detalles: detallesRecalculados });
    } else {
      setInputValues(prev => ({ ...prev, [key]: formatNumber(numValue) }));
      detalles[index] = { ...detalles[index] };
      setPlanilla({ ...planilla, detalles });
    }
  };

  const handleDetalleChange = (index: number, field: string, value: number) => {
    if (!planilla) return;
    const detalles = [...(planilla.detalles || [])];
    const detalle: any = { ...detalles[index] };
    detalle[field] = value;
    
    // Recalcular valores automáticos si cambia algún campo relevante
    if (['PDCantInicial', 'PDCantCompra', 'PDCantAjuste', 'PDCantVenta'].includes(field)) {
      const impactoComposiciones = calcularImpactoComposiciones(detalles.map((d, i) => i === index ? detalle : d));
      const { subtotal, valor, final, impactoPadre } = calcularValoresAuto(detalle, impactoComposiciones);
      
      detalle.PDCantSubtotal = subtotal;
      detalle.PDCantValor = valor;
      detalle.PDCantFinal = final;
      detalle._impactoPadre = impactoPadre;
    }
    
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

  const formatNumber = (num: number) => {
    if (num === 0) return '0';
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(2).replace(/\.?0+$/, '');
  };
  
  const parseNumber = (str: string) => {
    if (!str || str.trim() === '') return 0;
    let cleaned = str.trim().replace(/\s/g, '');
    
    // Si tiene coma decimal (y no tiene punto), convertir a punto (formato latinoamericano: 25,25)
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes(',') && cleaned.includes('.')) {
      // Ambos presentes: remover comas de miles (formato 1,234.56)
      cleaned = cleaned.replace(/,/g, '');
    }
    
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
  };

  const calcularTotales = () => {
    if (!planilla) return { totalBruto: 0, efectivo: 0, bancos: 0, total: 0 };
    // Incluir TODOS los productos en los totales
    const detalles = planilla.detalles || [];
    const totalBruto = detalles.reduce((sum, d) => sum + (Number(d.PDCantValor) || 0), 0);
    const otros = planilla.otros || [];
    const otrosGastos = otros.filter((o) => ['Gastos', 'Compras', 'Turnos', 'Memorias'].includes(o.POCategoria)).reduce((sum, o) => sum + (Number(o.POValor) || 0), 0);
    const otrosBancos = otros.filter((o) => ['Bold', 'Nequi', 'Daviplata', 'QR', 'Datafono'].includes(o.POCategoria)).reduce((sum, o) => sum + (Number(o.POValor) || 0), 0);
    return { totalBruto, efectivo: totalBruto - otrosBancos, bancos: otrosBancos, total: totalBruto - otrosGastos };
  };

  const { totalBruto, efectivo, bancos, total } = calcularTotales();

  // Función para verificar si un producto es padre de alguna composición
  const isProductoPadre = (productoId: number): boolean => {
    return composiciones.some(c => c.PCProducto === productoId);
  };

  // Función para obtener nombre del producto padre de una composición
  const getNombreProductoPadre = (componenteId: number): string | null => {
    const comp = composiciones.find(c => c.PCComponente === componenteId);
    return comp?.producto?.ProductoNombre || comp?.componente?.ProductoNombre || null;
  };

  // BOTÓN GUARDAR
  const handleSave = async () => {
    if (!planilla) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const updateData = {
        PlanillaEstado: 'A',
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
      navigate('/');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // BOTÓN ENVIAR
  const handleSubmit = async () => {
    if (!planilla) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
  
    let tieneErrores = false;
    (planilla.detalles || []).forEach((d: any) => {
      const subtotalCalc = (Number(d.PDCantInicial) || 0) + (Number(d.PDCantCompra) || 0) - (Number(d.PDCantAjuste) || 0);
      const finalCalc = Number(d.PDCantFinal) || 0;
      // No mostrar error por impacto de composiciones
      if (Math.abs(subtotalCalc - (Number(d.PDCantSubtotal) || 0)) > 0.01) {
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
              const impactoPadre = (detalle as any)._impactoPadre || 0;
              const esPadre = isProductoPadre(Number(detalle.PDProducto));
              const esComponente = getNombreProductoPadre(Number(detalle.PDProducto)) !== null;
              const rowStyle = esPadre ? {backgroundColor: '#eaf2f8'} : esComponente ? {backgroundColor: '#f4f9fc'} : {};
              
              return (
              <tr key={index} style={rowStyle}>
                <td>
                  {detalle.producto?.ProductoNombre || 'Producto'}
                  {soloContabilidad && <span style={{color:'#666', fontSize:'0.8em', marginLeft:'5px'}}>(Solo Contabilidad)</span>}
                  {esPadre && <span style={{fontSize:'0.7em', marginLeft:'5px'}}>📦</span>}
                  {esComponente && <span style={{fontSize:'0.7em', marginLeft:'5px', color:'#27ae60'}}>← comp.</span>}
                </td>
                <td><input 
                  type="text" 
                  inputMode="decimal" 
                  disabled={soloContabilidad} 
                  value={inputValues[`${index}-PDCantInicial`] ?? formatNumber(Number(detalle.PDCantInicial) || 0)}
                  onChange={(e) => handleInputChange(`${index}-PDCantInicial`, e.target.value)}
                  onBlur={() => handleInputBlur(index, 'PDCantInicial')}
                  style={soloContabilidad ? {background:'#f0f0f0', color:'#999'} : {}} 
                /></td>
                <td><input 
                  type="text" 
                  inputMode="decimal" 
                  disabled={soloContabilidad} 
                  value={inputValues[`${index}-PDCantCompra`] ?? formatNumber(Number(detalle.PDCantCompra) || 0)}
                  onChange={(e) => handleInputChange(`${index}-PDCantCompra`, e.target.value)}
                  onBlur={() => handleInputBlur(index, 'PDCantCompra')}
                  style={soloContabilidad ? {background:'#f0f0f0', color:'#999'} : {}} 
                /></td>
                <td><input 
                  type="text" 
                  inputMode="decimal" 
                  disabled={soloContabilidad} 
                  value={inputValues[`${index}-PDCantAjuste`] ?? formatNumber(Number(detalle.PDCantAjuste) || 0)}
                  onChange={(e) => handleInputChange(`${index}-PDCantAjuste`, e.target.value)}
                  onBlur={() => handleInputBlur(index, 'PDCantAjuste')}
                  style={soloContabilidad ? {background:'#f0f0f0', color:'#999'} : {}} 
                /></td>
                <td style={{background:'#f5f5f5', color:'#666', fontWeight:'bold'}}>{formatNumber(Number(detalle.PDCantSubtotal) || 0)}</td>
                <td><input 
                  type="text" 
                  inputMode="decimal" 
                  value={inputValues[`${index}-PDCantVenta`] ?? formatNumber(Number(detalle.PDCantVenta) || 0)}
                  onChange={(e) => handleInputChange(`${index}-PDCantVenta`, e.target.value)}
                  onBlur={() => handleInputBlur(index, 'PDCantVenta')}
                /></td>
                <td><input 
                  type="text" 
                  inputMode="decimal" 
                  value={inputValues[`${index}-PDCantValor`] ?? formatNumber(Number(detalle.PDCantValor) || 0)}
                  onChange={(e) => handleInputChange(`${index}-PDCantValor`, e.target.value)}
                  onBlur={() => handleInputBlur(index, 'PDCantValor')}
                  placeholder={soloContabilidad ? "Ingrese valor" : ""} 
                  style={soloContabilidad ? {background:'#fffbe6'} : {}} 
                  title={soloContabilidad ? "Solo Contabilidad - Ingrese el valor manualmente" : ""} 
                /></td>
                <td style={{background: esPadre ? '#e8f4fc' : '#f5f5f5', color: esPadre ? '#2980b9' : '#666', fontWeight:'bold', position:'relative'}}>
                  {soloContabilidad ? '-' : formatNumber(Number(detalle.PDCantFinal) || 0)}
                  {esPadre && impactoPadre !== 0 && (
                    <span style={{display:'block', fontSize:'10px', color:'#7f8c8d'}}>
                      ({impactoPadre > 0 ? '+' : ''}{impactoPadre.toFixed(2)} comp.)
                    </span>
                  )}
                </td>
              </tr>
              );
            })}
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
                  <td><input type="text" value={otro.PODescripcion} onChange={(e) => handleOtroChange(index, 'PODescripcion', e.target.value)} placeholder="Descripcion" /></td>
                  <td><input type="text" inputMode="decimal" value={formatNumber(Number(otro.POValor) || 0)} onChange={(e) => handleOtroChange(index, 'POValor', parseNumber(e.target.value))} /></td>
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
