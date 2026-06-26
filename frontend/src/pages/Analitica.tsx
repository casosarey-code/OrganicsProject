import { useState, useEffect } from 'react';
import api from '../api/axios';
import * as XLSX from 'xlsx';
import '../styles/index.css';

interface DatosAnalitica {
  totales: { ventas: number; costos: number; ganancias: number };
  tendenciaDias: { fecha: string; ventas: number }[];
  productosMasVendidos: { producto: string; cantidad: number; valor: number }[];
  tendenciaPagos: { fecha: string; pagos: number }[];
  pagosPorCategoria: { categoria: string; valor: number; porcentaje: number }[];
  comparativaMeses: { mes: string; mesNombre: string; ventas: number }[];
  maxVentaDia: { maxVenta: number; fecha: string } | null;
  resumen: { year: number; month: number; cantidadPlanillas: number; total: number }[];
}

interface FiltroInfo {
  estado: string;
  descripcion: string;
  mensaje: string;
}

interface Opciones {
  years: number[];
  puntosVenta: { PuntoVentaID: number; PuntoVentaNombre: string; EmpresaNombre: string }[];
  filtroInfo?: FiltroInfo;
}

export default function Analitica() {
  const [datos, setDatos] = useState<DatosAnalitica | null>(null);
  const [opciones, setOpciones] = useState<Opciones | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mostrarFiltroInfo, setMostrarFiltroInfo] = useState(true);
const [filtros, setFiltros] = useState({
    year: '',
    month: '',
    day: '',
    puntoVentaId: '',
    estado: ''
  });

  useEffect(() => {
    fetchOpciones();
  }, []);

  useEffect(() => {
    fetchDatos();
  }, [filtros]);

  const fetchOpciones = async () => {
    try {
      const response = await api.get('/analitica/opciones');
      setOpciones(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

const fetchDatos = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.year) params.append('year', filtros.year.toString());
      if (filtros.month) params.append('month', filtros.month);
      if (filtros.day) params.append('day', filtros.day);
      if (filtros.puntoVentaId) params.append('puntoVentaId', filtros.puntoVentaId);
      if (filtros.estado) params.append('estado', filtros.estado);
      
      const response = await api.get(`/analitica?${params.toString()}`);
      setDatos(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString();

const formatCurrency = (num: number) => num.toLocaleString('es-CO');

const exportToExcelPuntual = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.year) params.append('year', filtros.year.toString());
      if (filtros.month) params.append('month', filtros.month);
      if (filtros.puntoVentaId) params.append('puntoVentaId', filtros.puntoVentaId);

      const response = await api.get(`/analitica/export-excel?${params.toString()}`);
      const { datos, sumatoria, year, mesNombre } = response.data;

      const wb = XLSX.utils.book_new();
      const titulo = filtros.month ? `REPORTE DE VENTAS - ${mesNombre} ${year}` : `REPORTE DE VENTAS - ${year}`;

      // Encabezados
      const headers = ['Día', 'Fecha', 'Ventas Brutas', 'Ventas Netas', 'BOLD', 'NEQUI', 'DAVIPLATA', 'QR', 'DATAFONO', 'EFECTIVO'];
      
// Obtener nombre del punto de venta
      const pvNombre = filtros.puntoVentaId 
        ? opciones?.puntosVenta.find(pv => pv.PuntoVentaID.toString() === filtros.puntoVentaId)?.EmpresaNombre || ''
        : 'Todos';

      const filtrosTexto = `Año: ${filtros.year || 'Todos'} | Mes: ${filtros.month ? new Date(2000, parseInt(filtros.month) - 1).toLocaleString('es', { month: 'long' }) : 'Todos'} | Punto de Venta: ${pvNombre}`;

      // Construir datos
      const allRows: any[][] = [
        [titulo],
        [filtrosTexto],
        [],
        headers,
      ];

      // Agregar datos de cada día
      for (const item of datos) {
        allRows.push([
          item.dia,
          item.fecha,
          item.ventasBrutas,
          item.ventasNetas,
          item.bold,
          item.nequi,
          item.daviplata,
          item.qr,
          item.datafono || 0,
          item.efectivo,
        ]);
      }

      // Sumatoria
      allRows.push([
        '',
        'TOTAL',
        sumatoria.ventasBrutas,
        sumatoria.ventasNetas,
        sumatoria.bold,
        sumatoria.nequi,
        sumatoria.daviplata,
        sumatoria.qr,
        sumatoria.datafono || 0,
        sumatoria.efectivo,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(allRows);

      // Estilo título (fila 1)
      ws['A1'] = { t: 's', v: titulo };
      ws['A1'].s = { font: { bold: true, sz: 14 } };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

      // Estilos encabezados (fila 3, índice 2)
      for (let i = 0; i < headers.length; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: 2, c: i });
        if (!ws[cellRef]) ws[cellRef] = { t: 's' };
        ws[cellRef].s = {
          bold: true,
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          },
          alignment: { horizontal: 'center' }
        };
      }

      // Estilos sumatoria (última fila) - 10 columnas
      const lastRowIdx = allRows.length - 1;
      for (let i = 0; i < 10; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: lastRowIdx, c: i });
        if (!ws[cellRef]) ws[cellRef] = { t: 's' };
        ws[cellRef].s = {
          bold: true,
          fill: { fgColor: 'FFFF00' },
          border: {
            top: { style: 'medium' },
            bottom: { style: 'medium' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      // Anchos de columna - 10 columnas
      ws['!cols'] = [
        { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Reporte Diario');
      const nombreArchivo = filtros.month 
        ? `reporte_${mesNombre}_${year}.xlsx`
        : `reporte_${year}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al generar el reporte');
    }
  };

const exportToPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.year) params.append('year', filtros.year.toString());
      if (filtros.month) params.append('month', filtros.month);
      if (filtros.puntoVentaId) params.append('puntoVentaId', filtros.puntoVentaId);

      const response = await api.get(`/analitica/export-excel?${params.toString()}`);
      const { datos, sumatoria, year, mesNombre } = response.data;

      const { jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = autoTableModule.default;

      const doc = new jsPDF('l', 'mm', 'a4'); // Horizontal para más columnas
      const pageWidth = doc.internal.pageSize.getWidth();

      // Título
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const titulo = filtros.month ? `REPORTE DE VENTAS - ${mesNombre} ${year}` : `REPORTE DE VENTAS - ${year}`;
      doc.text(titulo, pageWidth / 2, 12, { align: 'center' });

      // Filtros aplicados
      const pvNombre = filtros.puntoVentaId 
        ? opciones?.puntosVenta.find(pv => pv.PuntoVentaID.toString() === filtros.puntoVentaId)?.EmpresaNombre || ''
        : 'Todos';
      const filtrosTexto = `Año: ${filtros.year || 'Todos'} | Mes: ${filtros.month ? new Date(2000, parseInt(filtros.month) - 1).toLocaleString('es', { month: 'long' }) : 'Todos'} | PV: ${pvNombre}`;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(filtrosTexto, pageWidth / 2, 18, { align: 'center' });

      // Preparar datos para la tabla (con Datafono)
      const headers = [['Día', 'Fecha', 'Ventas Brutas', 'Ventas Netas', 'BOLD', 'NEQUI', 'DAVIPLATA', 'QR', 'DATAFONO', 'EFECTIVO']];
      
      const body = datos.map((item: any) => [
        item.dia.toString(),
        item.fecha,
        item.ventasBrutas.toLocaleString('es-CO'),
        item.ventasNetas.toLocaleString('es-CO'),
        item.bold.toLocaleString('es-CO'),
        item.nequi.toLocaleString('es-CO'),
        item.daviplata.toLocaleString('es-CO'),
        item.qr.toLocaleString('es-CO'),
        (item.datafono || 0).toLocaleString('es-CO'),
        item.efectivo.toLocaleString('es-CO'),
      ]);

      // Agregar fila de totales
      body.push([
        '',
        'TOTAL',
        sumatoria.ventasBrutas.toLocaleString('es-CO'),
        sumatoria.ventasNetas.toLocaleString('es-CO'),
        sumatoria.bold.toLocaleString('es-CO'),
        sumatoria.nequi.toLocaleString('es-CO'),
        sumatoria.daviplata.toLocaleString('es-CO'),
        sumatoria.qr.toLocaleString('es-CO'),
        (sumatoria.datafono || 0).toLocaleString('es-CO'),
        sumatoria.efectivo.toLocaleString('es-CO'),
      ]);

      // Tabla principal con estilos reducidos
      autoTable(doc, {
        head: headers,
        body: body,
        startY: 22,
        theme: 'grid',
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7,
          cellPadding: 1,
        },
        bodyStyles: {
          fontSize: 6,
          halign: 'right',
          cellPadding: 1,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 18 },
        },
        didParseCell: (data: any) => {
          if (data.row.index === body.length - 1) {
            data.cell.styles.fillColor = [255, 255, 0];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [0, 0, 0];
            data.cell.styles.fontSize = 7;
          }
        },
        margin: { left: 8, right: 8 },
      });

      // Guardar
      const nombreArchivo = filtros.month 
        ? `reporte_${mesNombre}_${year}.pdf`
        : `reporte_${year}.pdf`;
      doc.save(nombreArchivo);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  const handleFilterChange = (field: string, value: string | number) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading && !datos) return <div className="loading">Cargando...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h1>Analítica</h1>
        </div>
<div className="header-actions">
          <button onClick={exportToExcelPuntual} className="btn btn-secondary" disabled={!filtros.year}>
            📊 Reporte Mensual
          </button>
          <button onClick={exportToPDF} className="btn btn-secondary" disabled={!datos}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

{/* Filtros */}
      {opciones?.filtroInfo && mostrarFiltroInfo && (
        <div style={{ 
          backgroundColor: '#e8f5e9', 
          border: '1px solid #4caf50', 
          borderRadius: '8px', 
          padding: '8px 12px', 
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>ℹ️</span>
            <span style={{ color: '#2e7d32', fontSize: '13px' }}>
              Filtro basado en estado <strong>Revisada (D)</strong>
            </span>
          </div>
          <button 
            onClick={() => setMostrarFiltroInfo(false)}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '18px', 
              cursor: 'pointer',
              color: '#2e7d32',
              padding: '0 4px'
            }}
            title="Ocultar mensaje"
          >
            ✕
          </button>
        </div>
      )}
      <div className="form-section">
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="form-group">
            <label>Año</label>
            <select value={filtros.year} onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}>
              <option value="">Todos</option>
              {opciones?.years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mes</label>
            <select value={filtros.month} onChange={(e) => handleFilterChange('month', e.target.value)}>
              <option value="">Todos</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('es', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Día</label>
            <select value={filtros.day} onChange={(e) => handleFilterChange('day', e.target.value)}>
              <option value="">Todos</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
<div className="form-group">
            <label>Estado</label>
            <select value={filtros.estado} onChange={(e) => handleFilterChange('estado', e.target.value)}>
              <option value="">Todos</option>
              <option value="A">🔵 Abierta</option>
              <option value="B">🔴 Con alertas</option>
              <option value="C">🟢 Cerrada/Completada</option>
              <option value="D">🟠 Revisada</option>
            </select>
          </div>
          <div className="form-group">
            <label>Punto de Venta</label>
            <select value={filtros.puntoVentaId} onChange={(e) => handleFilterChange('puntoVentaId', e.target.value)}>
              <option value="">Todos</option>
              {opciones?.puntosVenta.map(pv => (
                <option key={pv.PuntoVentaID} value={pv.PuntoVentaID}>
                  {pv.EmpresaNombre} - {pv.PuntoVentaNombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {datos && (
        <>
          {/* Totales */}
          <div className="dashboard-cards">
            <div className="card card-primary">
              <div className="card-header">Total de Ventas</div>
              <div className="card-value">$ {formatNumber(datos.totales.ventas)}</div>
            </div>
            <div className="card card-danger">
              <div className="card-header">Total de Costos</div>
              <div className="card-value">$ {formatNumber(datos.totales.costos)}</div>
            </div>
            <div className="card card-success">
              <div className="card-header">Total de Ganancias</div>
              <div className="card-value">$ {formatNumber(datos.totales.ganancias)}</div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="form-section">
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 6 }}>
                <h3>Tendencia de Ventas (30 días)</h3>
                <div className="chart-container">
                  {datos.tendenciaDias.length > 0 ? (
                    <div className="bar-chart">
                      {datos.tendenciaDias.map((d, i) => {
                        const max = Math.max(...datos.tendenciaDias.map(x => x.ventas));
                        return (
                          <div key={i} className="bar-item">
                            <div 
                              className="bar" 
                              style={{ height: `${max > 0 ? (d.ventas / max) * 100 : 0}%` }}
                              title={`${d.fecha}: $${formatNumber(d.ventas)}`}
                            />
                            <span className="bar-label">{new Date(d.fecha).getDate()}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="no-data">Sin datos de ventas</p>
                  )}
                </div>
              </div>
              <div style={{ flex: 4 }}>
                <h3>Productos Más Vendidos</h3>
                <div className="chart-container">
                  {datos.productosMasVendidos.length > 0 ? (
                    <div className="list-items">
                      {datos.productosMasVendidos.slice(0, 5).map((p, i) => (
                        <div key={i} className="list-item">
                          <span className="list-rank">#{i + 1}</span>
                          <span className="list-name">{p.producto}</span>
                          <span className="list-value">${formatNumber(p.valor)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">Sin datos de productos</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pagos por Categoría y Máximas */}
          <div className="form-section">
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 6 }}>
                <h3>Pagos por Categoría</h3>
                <div className="chart-container">
                  {datos.pagosPorCategoria.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                      {/* Gráfica de torta simplificada */}
                      <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                          {(() => {
                            let acumPercent = 0;
                            const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
                            return datos.pagosPorCategoria.map((cat, i) => {
                              const percent = cat.porcentaje;
                              const circumference = 2 * Math.PI * 40;
                              const dashArray = `${(percent / 100) * circumference} ${circumference}`;
                              const strokeOffset = -(acumPercent / 100) * circumference;
                              acumPercent += percent;
                              return (
                                <circle
                                  key={i}
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="none"
                                  stroke={colors[i % colors.length]}
                                  strokeWidth="20"
                                  strokeDasharray={dashArray}
                                  strokeDashoffset={strokeOffset}
                                />
                              );
                            });
                          })()}
                        </svg>
                      </div>
                      {/* Leyenda */}
                      <div style={{ flex: 1 }}>
                        {datos.pagosPorCategoria.map((cat, i) => {
                          const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
                          return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: colors[i % colors.length] }} />
                                <span style={{ fontWeight: 500 }}>{cat.categoria}</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontWeight: 700, color: colors[i % colors.length] }}>${formatNumber(cat.valor)}</span>
                                <span style={{ marginLeft: '8px', color: '#888', fontSize: '12px' }}>{cat.porcentaje}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="no-data">Sin datos de pagos</p>
                  )}
                </div>
              </div>
              <div style={{ flex: 4 }}>
                <h3>Ventas del Mes</h3>
                <div className="chart-container">
                  {(() => {
                    // Obtener el mes actual
                    const hoy = new Date();
                    const mesActual = hoy.getMonth();
                    const añoActual = hoy.getFullYear();
                    
                    // Filtrar ventas del mes actual
                    const ventasDelMes = datos.tendenciaDias.filter(d => {
                      const fecha = new Date(d.fecha);
                      return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
                    });
                    
                    if (ventasDelMes.length === 0) {
                      return <p className="no-data">Sin datos del mes</p>;
                    }
                    
                    // Calcular días del mes actual (incluye bisiestos)
                    const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
                    
                    // Crear array con todos los días del mes
                    const diasMes = Array.from({ length: diasEnMes }, (_, i) => i + 1);
                    
                    return (
                      <div className="bar-chart">
                        {diasMes.map((dia, i) => {
                          const ventaDia = ventasDelMes.find(d => new Date(d.fecha).getDate() === dia);
                          const max = Math.max(...ventasDelMes.map(x => x.ventas));
                          return (
                            <div key={i} className="bar-item" title={`Día ${dia}: $${formatNumber(ventaDia?.ventas || 0)}`}>
                              <div 
                                className="bar bar-secondary" 
                                style={{ height: `${max > 0 ? ((ventaDia?.ventas || 0) / max) * 100 : 0}%` }}
                              />
                              <span className="bar-label">{dia}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
