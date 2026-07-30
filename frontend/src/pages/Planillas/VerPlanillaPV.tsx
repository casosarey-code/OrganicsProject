import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { planillasApi } from '../../api';
import { Planilla } from '../../types';
import * as XLSX from "xlsx";
import './CompletarPlanilla.css';

export default function VerPlanillaPV() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  const formatNumber = (num: number) => {
    if (num === 0) return '0';
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toFixed(2).replace(/\.?0+$/, '');
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
      ['', '', '', '', '', '', 'TOTAL VENTA BRUTA:', formatNumber(totalBruto).replace(/,/g, '')],
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
      ['Total', formatNumber(total).replace(/,/g, '')],
      ['Efectivo', formatNumber(efectivo).replace(/,/g, '')],
      ['Bancos', formatNumber(bancos).replace(/,/g, '')],
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

  if (isLoading) return <div className="loading">Cargando...</div>;
  if (!planilla) return <div className="no-data">Planilla no encontrada</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h1>Ver Planilla</h1>
          <span className="planilla-info">
            {planilla.puntoVenta?.EmpresaNombre} - {new Date(planilla.PlanillaFecha).toLocaleDateString()} -{' '}
            <strong>
              Estado:{' '}
              {planilla.PlanillaEstado === 'A' ? (
                <span style={{ color: '#3498db' }}>🔵 Abierta</span>
              ) : planilla.PlanillaEstado === 'B' ? (
                <span style={{ color: '#e74c3c' }}>🔴 Con alertas</span>
              ) : planilla.PlanillaEstado === 'C' ? (
                <span style={{ color: '#27ae60' }}>🟢 Cerrada/Completada</span>
              ) : (
                <span style={{ color: '#f39c12' }}>🟠 Revisada</span>
              )}
            </strong>
          </span>
        </div>
        <div className="header-actions">
          <button onClick={exportToExcel} className="btn btn-secondary">
            📊 Excel
          </button>
          <button onClick={exportToPDF} className="btn btn-secondary">
            📄 PDF
          </button>
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
              const soloContabilidad = detalle.producto?.ProductoSoloContabilidad;
              return (
                <tr key={index}>
                  <td>
                    {detalle.producto?.ProductoNombre || 'Producto'}
                    {soloContabilidad && <span style={{ color: '#666', fontSize: '0.8em', marginLeft: '5px' }}>(Solo Contabilidad)</span>}
                  </td>
                  <td>{formatNumber(Number(detalle.PDCantInicial) || 0)}</td>
                  <td>{formatNumber(Number(detalle.PDCantCompra) || 0)}</td>
                  <td>{formatNumber(Number(detalle.PDCantAjuste) || 0)}</td>
                  <td style={{ background: '#f5f5f5', color: '#666', fontWeight: 'bold' }}>
                    {formatNumber(Number(detalle.PDCantSubtotal) || 0)}
                  </td>
                  <td>{formatNumber(Number(detalle.PDCantVenta) || 0)}</td>
                  <td>
                    ${formatNumber(Number(detalle.PDCantValor) || 0)}
                    {soloContabilidad && <span style={{ display: 'block', fontSize: '11px', color: '#7f8c8d' }}>Unit: ${formatNumber(Number(detalle.valorEmpresa) || 0)}</span>}
                  </td>
                  <td style={{ background: '#f5f5f5', color: '#666', fontWeight: 'bold' }}>
                    {soloContabilidad ? '-' : formatNumber(Number(detalle.PDCantFinal) || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="total-bruto">
          <strong>Total de venta bruta: </strong> ${formatNumber(Number(totalBruto))}
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
                  <td>{otro.PODescripcion}</td>
                  <td>${formatNumber(Number(otro.POValor) || 0)}</td>
                  <td>{otro.POCategoria}</td>
                  <td>
                    {otro.POUrlEvidencia ? (
                      <a
                        href={otro.POUrlEvidencia}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3498db', textDecoration: 'underline' }}
                      >
                        Ver evidencia
                      </a>
                    ) : (
                      <span style={{ color: '#7f8c8d' }}>Sin evidencia</span>
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
          <strong>Usuario:</strong> Recuerda que este reporte debe ser enviado a Diario
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
