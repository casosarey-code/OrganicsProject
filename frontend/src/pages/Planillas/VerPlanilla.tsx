import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { planillasApi } from "../../api";
import { Planilla } from "../../types";
import * as XLSX from "xlsx";
import "./CompletarPlanilla.css";

interface Composicion {
  PCID: number;
  PCProducto: number;
  PCComponente: number;
  PCCantidad: number;
  PCEmpresa: number | null;
  producto?: { ProductoID: number; ProductoNombre: string };
  componente?: { ProductoID: number; ProductoNombre: string };
}

export default function VerPlanilla() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [composiciones, setComposiciones] = useState<Composicion[]>([]);
  
  // Reordenar productos
  const [editandoOrden, setEditandoOrden] = useState(false);
  const [ordenTemporal, setOrdenTemporal] = useState<any[]>([]);
  
  const iniciarReordenamiento = () => {
    if (!planilla?.detalles) return;
    const sorted = [...planilla.detalles].sort((a, b) => (a.PDOrden || 999) - (b.PDOrden || 999));
    setOrdenTemporal(sorted);
    setEditandoOrden(true);
  };
  
  const moverArriba = (index: number) => {
    if (index === 0) return;
    const newOrden = [...ordenTemporal];
    [newOrden[index - 1], newOrden[index]] = [newOrden[index], newOrden[index - 1]];
    setOrdenTemporal(newOrden);
  };
  
  const moverAbajo = (index: number) => {
    if (index === ordenTemporal.length - 1) return;
    const newOrden = [...ordenTemporal];
    [newOrden[index], newOrden[index + 1]] = [newOrden[index + 1], newOrden[index]];
    setOrdenTemporal(newOrden);
  };
  
  const guardarOrden = async () => {
    try {
      const token = localStorage.getItem('token');
      const ordenes = ordenTemporal.map((det, idx) => ({
        pdId: det.PDID,
        nuevoOrden: idx + 1,
      }));
      
      const response = await fetch(`/api/planillas/${id}/reordenar`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ordenes }),
      });
      
      if (!response.ok) throw new Error('Error al guardar');
      
      setEditandoOrden(false);
      fetchPlanilla();
      alert('Orden guardado exitosamente');
    } catch (err) {
      alert('Error al guardar el orden');
    }
  };

  // Aplicar orden desde la empresa
  const aplicarOrdenEmpresa = async () => {
    if (!planilla || !confirm('¿Aplicar el orden de productos desde la configuración de la empresa?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/planillas/${id}/aplicar-orden-empresa`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Error al aplicar orden');
      
      alert('Orden aplicado correctamente desde la empresa');
      fetchPlanilla();
    } catch (err) {
      alert('Error al aplicar el orden de la empresa');
    }
  };

  useEffect(() => {
    if (id) {
      fetchPlanilla();
      fetchComposiciones();
    }
  }, [id]);

  // Función para cargar composiciones del backend (filtradas por empresa)
  const fetchComposiciones = async () => {
    try {
      const token = localStorage.getItem('token');
      // Pasar empresaId si está disponible en la planilla
      const empresaId = planilla?.puntoVenta?.EmpresaID;
      const url = empresaId 
        ? `/api/productos/composicion?empresaId=${empresaId}`
        : '/api/productos/composicion';
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComposiciones(data);
      }
    } catch (err) {
      console.error('Error al cargar composiciones:', err);
    }
  };

  // Calcular impacto de composiciones (con deduplicación)
  const calcularImpactoComposiciones = (detalles: any[]): Map<number, number> => {
    const impacto = new Map<number, number>();
    
    // Deduplicar: preferir empresa-specific sobre null
    const composicionMap = new Map<string, Composicion>();
    composiciones.forEach(c => {
      const key = `${c.PCProducto}-${c.PCComponente}`;
      const existing = composicionMap.get(key);
      if (!existing || (c.PCEmpresa !== null && existing.PCEmpresa === null)) {
        composicionMap.set(key, c);
      }
    });
    
    detalles.forEach((detalle) => {
      const venta = Number(detalle.PDCantVenta) || 0;
      if (venta <= 0) return;
      
      const productoId = Number(detalle.PDProducto);
      const composicionesDondeEsComponente = Array.from(composicionMap.values()).filter(c => c.PCComponente === productoId);
      
      composicionesDondeEsComponente.forEach(comp => {
        const padreId = comp.PCProducto;
        const cantidadEquivalente = venta * comp.PCCantidad;
        const impactoActual = impacto.get(padreId) || 0;
        impacto.set(padreId, impactoActual - cantidadEquivalente);
      });
    });
    
    return impacto;
  };

  const fetchPlanilla = async () => {
    setIsLoading(true);
    try {
      const data = await planillasApi.getById(parseInt(id!));
      setPlanilla(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al cargar planilla");
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString();

  // Exportar a Excel
  const exportToExcel = () => {
    if (!planilla) return;
    
    const wb = XLSX.utils.book_new();
    const titulo = `PLANILLA - ${planilla.puntoVenta?.EmpresaNombre || 'Punto de Venta'} - ${new Date(planilla.PlanillaFecha).toLocaleDateString()}`;
    
    // Datos de la planilla
    const infoRows = [
      [titulo],
      [`Empresa: ${planilla.puntoVenta?.EmpresaNombre || 'N/A'}`],
      [`Fecha: ${new Date(planilla.PlanillaFecha).toLocaleDateString()}`],
      [`Estado: ${planilla.PlanillaEstado === 'A' ? 'Abierta' : planilla.PlanillaEstado === 'B' ? 'Con alertas' : planilla.PlanillaEstado === 'C' ? 'Cerrada' : 'Revisada'}`],
      [],
    ];

    // Encabezados de detalles
    const headers = ['Producto', 'N. Inicial', 'Compras', 'Ajustes', 'Subtotal', 'Venta', 'Valor Unit.', 'Valor Total', 'N. Final'];
    
    // Datos de detalles
    const detallesRows = (planilla.detalles || []).map((d: any) => [
      d.producto?.ProductoNombre || 'Producto',
      Number(d.PDCantInicial) || 0,
      Number(d.PDCantCompra) || 0,
      Number(d.PDCantAjuste) || 0,
      Number(d.PDCantSubtotal) || 0,
      Number(d.PDCantVenta) || 0,
      Number(d.valorEmpresa) || 0,
      Number(d.PDCantValor) || 0,
      Number(d.PDCantFinal) || 0,
    ]);

    // Totales
    const totalesRows = [
      [],
      ['', '', '', '', '', '', 'TOTAL VENTA BRUTA:', totalBruto],
      ['', '', '', '', '', '', 'TOTAL CALCULADO:', totalBrutoCalc],
      [],
    ];

    // Otros/Gastos
    const gastosHeaders = ['Descripción', 'Valor', 'Categoría'];
    const gastosRows = (planilla.otros || []).map((o: any) => [
      o.PODescripcion,
      Number(o.POValor) || 0,
      o.POCategoria,
    ]);

    // Resumen
    const resumenRows = [
      [],
      ['RESUMEN'],
      ['Total', total],
      ['Efectivo', efectivo],
      ['Bancos', bancos],
    ];

    // Combinar todo
    const allRows = [
      ...infoRows,
      headers,
      ...detallesRows,
      ...totalesRows,
      [],
      gastosHeaders,
      ...gastosRows,
      ...resumenRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(allRows);

    // Estilos
    ws['A1'] = { t: 's', v: titulo };
    ws['A1'].s = { font: { bold: true, sz: 14 } };
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];

    // Anchos de columna
    ws['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Planilla');
    
    const fecha = new Date(planilla.PlanillaFecha).toISOString().split('T')[0];
    const empresa = planilla.puntoVenta?.EmpresaNombre || 'PV';
    XLSX.writeFile(wb, `planilla_${empresa}_${fecha}.xlsx`);
  };

  // Exportar a PDF
  const exportToPDF = async () => {
    if (!planilla) return;
    
    const { jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PLANILLA DIARIA', pageWidth / 2, 12, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${planilla.puntoVenta?.EmpresaNombre || 'Punto de Venta'} - ${new Date(planilla.PlanillaFecha).toLocaleDateString()}`, pageWidth / 2, 18, { align: 'center' });

    // Tabla de detalles
    const detallesData = (planilla.detalles || []).map((d: any) => [
      d.producto?.ProductoNombre || 'Producto',
      formatNumber(Number(d.PDCantInicial) || 0),
      formatNumber(Number(d.PDCantCompra) || 0),
      formatNumber(Number(d.PDCantAjuste) || 0),
      formatNumber(Number(d.PDCantSubtotal) || 0),
      formatNumber(Number(d.PDCantVenta) || 0),
      `$${formatNumber(Number(d.PDCantValor) || 0)}`,
    ]);

    autoTable(doc, {
      head: [['Producto', 'Inicial', 'Compras', 'Ajustes', 'Subtotal', 'Venta', 'Valor']],
      body: detallesData,
      startY: 24,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 40 } },
    });

    // Totales
    const finalY = (doc as any).lastAutoTable?.finalY || 24;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Venta Bruta: $${formatNumber(totalBruto)}`, 14, finalY + 8);
    doc.text(`Total Calculado: $${formatNumber(totalBrutoCalc)}`, 14, finalY + 14);

    // Gastos
    if ((planilla.otros || []).length > 0) {
      const gastosData = (planilla.otros || []).map((o: any) => [
        o.PODescripcion,
        `$${formatNumber(Number(o.POValor) || 0)}`,
        o.POCategoria,
      ]);

      autoTable(doc, {
        head: [['Descripción', 'Valor', 'Categoría']],
        body: gastosData,
        startY: finalY + 20,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
      });
    }

    // Resumen
    const resumenY = (doc as any).lastAutoTable?.finalY || finalY + 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN', 14, resumenY + 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: $${formatNumber(total)}`, 14, resumenY + 18);
    doc.text(`Efectivo: $${formatNumber(efectivo)}`, 14, resumenY + 24);
    doc.text(`Bancos: $${formatNumber(bancos)}`, 14, resumenY + 30);

    // Guardar
    const fecha = new Date(planilla.PlanillaFecha).toISOString().split('T')[0];
    const empresa = planilla.puntoVenta?.EmpresaNombre || 'PV';
    doc.save(`planilla_${empresa}_${fecha}.pdf`);
  };

  // Función para validar errores en detalles (con composiciones)
  const validarDetalle = (detalle: any, impactoComposiciones: Map<number, number> = new Map()) => {
    const subtotalCalculado =
      (Number(detalle.PDCantInicial) || 0) +
      (Number(detalle.PDCantCompra) || 0) -
      (Number(detalle.PDCantAjuste) || 0);
    const subtotalRegistrado = Number(detalle.PDCantSubtotal) || 0;
    const errorSubtotal = subtotalCalculado !== subtotalRegistrado;
    
    // Incluir impacto de composiciones en el cálculo del N. Final
    const impactoPadre = impactoComposiciones.get(Number(detalle.PDProducto)) || 0;
    const finalCalculado =
      subtotalCalculado - (Number(detalle.PDCantVenta) || 0) + impactoPadre;
    const finalRegistrado = Number(detalle.PDCantFinal) || 0;
    const errorFinal = Math.abs(finalCalculado - finalRegistrado) > 0.01;
    
    const valorCalculado =
      (Number(detalle.valorEmpresa) || 0) * (Number(detalle.PDCantVenta) || 0);
    const valorRegistrado = Number(detalle.PDCantValor) || 0;
    const errorValor = Math.abs(valorCalculado - valorRegistrado) > 0.01;
    return {
      errorSubtotal,
      errorFinal,
      errorValor,
      subtotalCalculado,
      finalCalculado,
      valorCalculado,
      impactoPadre,
    };
  };

  const calcularTotales = () => {
    if (!planilla) return { totalBruto: 0, totalBrutoCalc: 0, efectivo: 0, bancos: 0, total: 0 };
    
    const detalles = planilla.detalles || [];
    
    // Total venta bruta = suma de PDCantValor (TODOS los productos)
    const totalBruto = detalles.reduce(
      (sum, d) => sum + (Number(d.PDCantValor) || 0),
      0,
    );
    // Total venta bruta calculada = suma de (valorEmpresa × PDCantVenta) (TODOS los productos)
    const totalBrutoCalc = detalles.reduce(
      (sum, d) => sum + (Number(d.valorEmpresa) || 0) * (Number(d.PDCantVenta) || 0),
      0,
    );
    
    const otros = planilla.otros || [];
    const otrosGastos = otros
      .filter((o) =>
        ["Gastos", "Compras", "Turnos", "Memorias"].includes(o.POCategoria),
      )
      .reduce((sum, o) => sum + (Number(o.POValor) || 0), 0);
    // Incluye Datafono en bancos
    const otrosBancos = otros
      .filter((o) =>
        ["Bold", "Nequi", "Daviplata", "QR", "Datafono"].includes(o.POCategoria),
      )
      .reduce((sum, o) => sum + (Number(o.POValor) || 0), 0);
    return {
      totalBruto,
      totalBrutoCalc,
      efectivo: totalBruto - otrosBancos,
      restanteEfectivo: totalBruto - otrosBancos - otrosGastos,
      bancos: otrosBancos,
      total: totalBruto - otrosGastos,
    };
  };

  const { totalBruto, totalBrutoCalc, efectivo, restanteEfectivo, bancos, total } = calcularTotales();

  const handleMarcarRevisada = async () => {
    if (!planilla) return;
    if (!confirm('¿Marcar esta planilla como revisada?')) return;
    try {
      const updated = await planillasApi.marcarRevisada(planilla.PlanillaID);
      setPlanilla(updated);
      alert('Planilla marcada como revisada');
      navigate('/planillas');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al marcar como revisada');
    }
  };

  if (isLoading) return <div className="loading">Cargando...</div>;
  if (!planilla) return <div className="no-data">Planilla no encontrada</div>;

  // Calcular impacto de composiciones para la validación
  const impactoComposiciones = calcularImpactoComposiciones(planilla.detalles || []);

  // Función para verificar si es producto padre
  const isProductoPadre = (productoId: number): boolean => {
    return composiciones.some(c => c.PCProducto === productoId);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h1>Ver Planilla</h1>
          <span className="planilla-info">
            {planilla.puntoVenta?.EmpresaNombre} -{" "}
            {new Date(planilla.PlanillaFecha).toLocaleDateString()} -{" "}
            <strong>
              Estado:{" "}
              {planilla.PlanillaEstado === "A" ? (
                <span style={{ color: '#3498db' }}>🔵 Abierta</span>
              ) : planilla.PlanillaEstado === "B" ? (
                <span style={{ color: '#e74c3c' }}>🔴 Con alertas</span>
              ) : planilla.PlanillaEstado === "C" ? (
                <span style={{ color: '#27ae60' }}>🟢 Cerrada/Completada</span>
              ) : (
                <span style={{ color: '#f39c12' }}>🟠 Revisada</span>
              )}
            </strong>
          </span>
        </div>
        <div className="header-actions">
          {!editandoOrden ? (
            <>
              <button onClick={aplicarOrdenEmpresa} className="btn btn-secondary">
                🏢 Orden Empresa
              </button>
              <button onClick={iniciarReordenamiento} className="btn btn-secondary" style={{ marginLeft: '5px' }}>
                ↕ Reordenar
              </button>
            </>
          ) : (
            <>
              <button onClick={guardarOrden} className="btn btn-primary">
                ✓ Guardar Orden
              </button>
              <button onClick={() => setEditandoOrden(false)} className="btn btn-secondary" style={{ marginLeft: '5px' }}>
                Cancelar
              </button>
            </>
          )}
          <button onClick={exportToExcel} className="btn btn-secondary" style={{ marginLeft: '10px' }}>
            📊 Excel
          </button>
          <button onClick={exportToPDF} className="btn btn-secondary">
            📄 PDF
          </button>
          {planilla.PlanillaEstado !== "D" && (
            <button onClick={handleMarcarRevisada} className="btn btn-success">
              Marcar como Revisada
            </button>
          )}
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      <div className="form-section">
        <h3>Detalles del Inventario</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>N. Inicial</th>
              <th>Compras</th>
              <th>Ajustes</th>
              <th>Subtotal</th>
              <th>Venta</th>
              <th>Valor</th>
              <th>N. Final</th>
            </tr>
          </thead>
          <tbody>
            {(planilla.detalles || []).map((detalle, index) => {
              const {
                errorSubtotal,
                errorFinal,
                errorValor,
                subtotalCalculado,
                finalCalculado,
                valorCalculado,
                impactoPadre,
              } = validarDetalle(detalle, impactoComposiciones);
              // Marca fila completa si hay error en Subtotal, Final o Valor
              const errorFila = errorSubtotal || errorFinal || errorValor;
              const soloContabilidad = detalle.producto?.ProductoSoloContabilidad;
              const esPadre = isProductoPadre(Number(detalle.PDProducto));
              return (
                <tr key={index} className={`${errorFila ? "row-error" : ""} ${soloContabilidad ? "row-solo-contabilidad" : ""} ${esPadre ? "row-padre" : ""}`}>
                  <td>
                    {detalle.producto?.ProductoNombre || "Producto"}
                    {soloContabilidad && <span style={{ color: '#666', fontSize: '0.8em', marginLeft: '5px' }}>(Solo Contabilidad)</span>}
                    {esPadre && <span style={{fontSize:'0.7em', marginLeft:'5px'}}>📦</span>}
                  </td>
                  <td>
                    <input
                      type="tel"
                      disabled
                      value={formatNumber(Number(detalle.PDCantInicial) || 0)}
                    />
                  </td>
                  <td>
                    <input
                      type="tel"
                      disabled
                      value={formatNumber(Number(detalle.PDCantCompra) || 0)}
                    />
                  </td>
                  <td>
                    <input
                      type="tel"
                      disabled
                      value={formatNumber(Number(detalle.PDCantAjuste) || 0)}
                    />
                  </td>
                  <td
                    className={errorSubtotal ? "cell-error" : ""}
                  >
                    <div>
                      {formatNumber(Number(detalle.PDCantSubtotal) || 0)}
                    </div>
                    <div
                      className="calc-hint"
                    >
                      {errorSubtotal ? `Calc: ${formatNumber(subtotalCalculado)}` : formatNumber(subtotalCalculado)}
                    </div>
                  </td>
                  <td>
                    <div>{formatNumber(Number(detalle.PDCantVenta) || 0)}</div>
                    <div style={{ fontSize: "11px", color: "#7f8c8d" }}>
                      $ {formatNumber(Number(detalle.valorEmpresa) || 0)}
                    </div>
                  </td>
                  <td
                    className={errorValor ? "cell-error" : ""}
                  >
                    <div>I: $ {formatNumber(Number(detalle.PDCantValor) || 0)}</div>
                    <div className="calc-hint">
                      Cal: $ {formatNumber(valorCalculado)}
                    </div>
                  </td>
                  <td
                    className={`${errorFinal ? "cell-error" : ""} ${esPadre ? "cell-padre" : ""}`}
                  >
                    <div>
                      R: {formatNumber(Number(detalle.PDCantFinal) || 0)}
                    </div>
                    <div className="calc-hint">
                      Calc: {formatNumber(finalCalculado)}
                    </div>
                    {esPadre && impactoPadre !== 0 && (
                      <div style={{fontSize:'10px', color:'#27ae60', marginTop:'2px'}}>
                        (±{impactoPadre.toFixed(2)} comp.)
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="total-bruto">
          <strong>Total de venta bruta: </strong> $
          {formatNumber(Number(totalBruto))}
        </div>
        <div className="total-bruto-calculado">
          <strong>Total venta bruta calculada: </strong> $
          {formatNumber(Number(totalBrutoCalc))}
        </div>
      </div>

      <div className="form-section">
        <h3>Gastos Extra / Otros</h3>
        {(planilla.otros || []).length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Descripcion</th>
                <th>Valor ($)</th>
                <th>Categoria</th>
                <th>Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {(planilla.otros || []).map((otro, index) => (
                <tr key={index}>
                  <td>
                    <input type="tel" disabled value={otro.PODescripcion} />
                  </td>
                  <td>
                    <input
                      type="tel"
                      disabled
                      value={formatNumber(Number(otro.POValor) || 0)}
                    />
                  </td>
                  <td>
                    <span>{otro.POCategoria}</span>
                  </td>
                  <td>
                    {otro.POUrlEvidencia &&
                    otro.POUrlEvidencia.startsWith("/") ? (
                      <a
                        href={otro.POUrlEvidencia}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#3498db",
                          textDecoration: "underline",
                          cursor: "pointer",
                        }}
                      >
                        Ver evidencia
                      </a>
                    ) : (
                      <span style={{ color: "#7f8c8d" }}>Sin evidencia</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No hay gastos registrados</p>
        )}
      </div>

      <div className="resumen-section">
        <div className="resumen-nota">
          <strong>Usuario:</strong> Recuerda que este reporte debe ser enviado a
          Diario
        </div>
        <div className="resumen-totales">
          <table className="totales-table">
            <tbody>
              <tr>
                <td>Total</td>
                <td className="value">${formatNumber(Number(total))}</td>
              </tr>
              <tr>
                <td>Efectivo</td>
                <td className="value">${formatNumber(Number(efectivo))}</td>
              </tr>
              <tr>
                <td>Restante en efectivo</td>
                <td className="value">${formatNumber(Number(restanteEfectivo))}</td>
              </tr>
              <tr>
                <td>Bancos</td>
                <td className="value">${formatNumber(Number(bancos))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
