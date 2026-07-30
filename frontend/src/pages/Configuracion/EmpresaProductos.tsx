import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { empresasApi, productosApi } from "../../api";
import { Empresa, Producto } from "../../types";
import "./EmpresaProductos.css";

interface EmpresaProducto {
  EPID: number;
  EmpresaID: number;
  EPProducto: number;
  EPValorProducto: number;
  EPOrden: number | null;
  EPActivo: boolean;
  producto?: {
    ProductoID: number;
    ProductoNombre: string;
    ProductoCodigo: string;
  };
}

export default function EmpresaProductos() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [productosEmpresa, setProductosEmpresa] = useState<EmpresaProducto[]>(
    [],
  );
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<number>(0);
  const [precioProducto, setPrecioProducto] = useState<number>(0);
  const [ordenProducto, setOrdenProducto] = useState<number>(0);
  
  // Estados para editar precio
  const [showEditPriceModal, setShowEditPriceModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EmpresaProducto | null>(null);
  const [newPrice, setNewPrice] = useState<number>(0);

  // Estados para editar orden
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editingOrderProduct, setEditingOrderProduct] = useState<EmpresaProducto | null>(null);
  const [newOrder, setNewOrder] = useState<number>(0);

  // Reordenar productos (subir/bajar)
  const [editandoOrden, setEditandoOrden] = useState(false);
  const [ordenTemporal, setOrdenTemporal] = useState<EmpresaProducto[]>([]);
  
  // Iniciar modo reordenamiento
  const iniciarReordenamiento = () => {
    const sorted = [...productosEmpresa].sort((a, b) => (a.EPOrden || 999) - (b.EPOrden || 999));
    setOrdenTemporal(sorted);
    setEditandoOrden(true);
  };
  
  // Mover producto arriba
  const moverArriba = (index: number) => {
    if (index === 0) return;
    const newOrden = [...ordenTemporal];
    [newOrden[index - 1], newOrden[index]] = [newOrden[index], newOrden[index - 1]];
    setOrdenTemporal(newOrden);
  };
  
  // Mover producto abajo
  const moverAbajo = (index: number) => {
    if (index === ordenTemporal.length - 1) return;
    const newOrden = [...ordenTemporal];
    [newOrden[index], newOrden[index + 1]] = [newOrden[index + 1], newOrden[index]];
    setOrdenTemporal(newOrden);
  };
  
  // Guardar nuevo orden
  const guardarOrden = async () => {
    try {
      const ordenes = ordenTemporal.map((pe, idx) => ({
        epId: pe.EPID,
        nuevoOrden: idx + 1,
      }));
      
      const response = await fetch("/api/empresa-planilla/reordenar", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ empresaId: parseInt(id!), ordenes }),
      });
      
      if (!response.ok) throw new Error("Error al guardar");
      
      setEditandoOrden(false);
      fetchData();
      alert("Orden guardado exitosamente");
    } catch (err) {
      alert("Error al guardar el orden");
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const empresaResponse = await empresasApi.getById(parseInt(id!));
      
      const productosEmpResponse = await fetch(`/api/empresa-planilla?empresaId=${id}`, {
        headers: getAuthHeaders(),
      });
      
      if (!productosEmpResponse.ok) {
        const errorData = await productosEmpResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${productosEmpResponse.status}`);
      }
      
      const productosEmp = await productosEmpResponse.json();
      
      const productos = await productosApi.getAll({ activo: true });
      
      setEmpresa(empresaResponse);
      setProductosEmpresa(Array.isArray(productosEmp) ? productosEmp : []);
      setProductosDisponibles(productos);
    } catch (err) {
      console.error("Error loading data:", err);
      alert(`Error al cargar datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProducto = async () => {
    if (!selectedProducto || !id) return;

    try {
      await fetch("/api/empresa-planilla", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          EmpresaID: parseInt(id),
          EPProducto: selectedProducto,
          EPValorProducto: precioProducto,
          EPOrden: ordenProducto,
        }),
      });
      setShowModal(false);
      setSelectedProducto(0);
      setPrecioProducto(0);
      setOrdenProducto(0);
      fetchData();
    } catch (err) {
      alert("Error al agregar producto");
    }
  };

  const handleDeleteProducto = async (epId: number) => {
    if (!confirm("¿Eliminar producto de esta empresa?")) return;

    try {
      await fetch(`/api/empresa-planilla/${epId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      fetchData();
    } catch (err) {
      alert("Error al eliminar producto");
    }
  };

  const handleToggleActivo = async (ep: EmpresaProducto) => {
    try {
      await fetch(`/api/empresa-planilla/${ep.EPID}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ EPActivo: !ep.EPActivo }),
      });
      fetchData();
    } catch (err) {
      alert("Error al actualizar producto");
    }
  };

  const handleEditPrice = (pe: EmpresaProducto) => {
    setEditingProduct(pe);
    setNewPrice(pe.EPValorProducto);
    setShowEditPriceModal(true);
  };

  const handleSavePrice = async () => {
    if (!editingProduct) return;
    
    try {
      await fetch(`/api/empresa-planilla/${editingProduct.EPID}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ EPValorProducto: newPrice }),
      });
      setShowEditPriceModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (err) {
      alert("Error al actualizar precio");
    }
  };

  // Filtrar productos que ya están asignados
  const productosEmpresaArray = Array.isArray(productosEmpresa) ? productosEmpresa : [];
  const productosDisponiblesArray = Array.isArray(productosDisponibles) ? productosDisponibles : [];
  
  const productosAsignados = productosEmpresaArray.map((pe) => pe.EPProducto);
  const productosSinAsignar = productosDisponiblesArray.filter(
    (p) => !productosAsignados.includes(p.ProductoID),
  );

  if (isLoading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Productos de: {empresa?.EmpresaNombre}</h1>
      </div>

      <div className="empresa-productos-actions">
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Agregar Producto
        </button>
        {!editandoOrden ? (
          <button onClick={iniciarReordenamiento} className="btn btn-secondary" style={{ marginLeft: '10px' }}>
            ↕ Reordenar
          </button>
        ) : (
          <>
            <button onClick={guardarOrden} className="btn btn-primary" style={{ marginLeft: '10px' }}>
              ✓ Guardar Orden
            </button>
            <button onClick={() => setEditandoOrden(false)} className="btn btn-secondary" style={{ marginLeft: '5px' }}>
              Cancelar
            </button>
          </>
        )}
      </div>

      {editandoOrden ? (
        <div className="orden-edit-container">
          <p style={{ marginBottom: '15px', color: '#666' }}>Arrastre o use las flechas para reordenar. El número de orden se asignará automáticamente.</p>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Código</th>
                <th>Producto</th>
                <th style={{ width: '100px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenTemporal.map((pe, index) => (
                <tr key={pe.EPID}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                  <td>{pe.producto?.ProductoCodigo || "-"}</td>
                  <td>{pe.producto?.ProductoNombre}</td>
                  <td>
                    <button onClick={() => moverArriba(index)} disabled={index === 0} className="btn btn-sm" style={{ marginRight: '5px' }}>↑</button>
                    <button onClick={() => moverAbajo(index)} disabled={index === ordenTemporal.length - 1} className="btn btn-sm">↓</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : productosEmpresa.length === 0 ? (
        <div className="no-data">
          <p>No hay productos asignados a esta empresa.</p>
          <p>Agregue productos para generar planillas.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Código</th>
              <th>Producto</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosEmpresa.sort((a, b) => (a.EPOrden || 999) - (b.EPOrden || 999)).map((pe) => (
              <tr key={pe.EPID} className={!pe.EPActivo ? "row-inactive" : ""}>
                <td>
                  <button
                    onClick={() => {
                      setEditingOrderProduct(pe);
                      setNewOrder(pe.EPOrden || 0);
                      setShowEditOrderModal(true);
                    }}
                    className="btn btn-sm btn-link"
                    style={{ padding: '2px 8px', minWidth: '40px' }}
                  >
                    {pe.EPOrden || '-'}
                  </button>
                </td>
                <td>{pe.producto?.ProductoCodigo || "-"}</td>
                <td>{pe.producto?.ProductoNombre}</td>
                <td>${pe.EPValorProducto?.toLocaleString()}</td>
                <td>
                  <span
                    className={`status status-${pe.EPActivo ? "active" : "inactive"}`}
                    onClick={() => handleToggleActivo(pe)}
                    style={{ cursor: "pointer" }}
                  >
                    {pe.EPActivo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    onClick={() => handleEditPrice(pe)}
                    className="btn btn-sm btn-secondary"
                    style={{ marginRight: '5px' }}
                  >
                    Precio
                  </button>
                  <button
                    onClick={() => handleDeleteProducto(pe.EPID)}
                    className="btn btn-sm btn-danger"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal para agregar producto */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Agregar Producto</h2>
              <button
                onClick={() => setShowModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Producto *</label>
                <select
                  value={selectedProducto}
                  onChange={(e) => {
                    setSelectedProducto(parseInt(e.target.value));
                    const prod = productosDisponibles.find(
                      (p) => p.ProductoID === parseInt(e.target.value),
                    );
                    if (prod) {
                      setPrecioProducto(Number(prod.ProductoPrecio));
                    }
                  }}
                  required
                >
                  <option value={0}>Seleccionar...</option>
                  {productosSinAsignar.map((p) => (
                    <option key={p.ProductoID} value={p.ProductoID}>
                      {p.ProductoNombre} ({p.ProductoCodigo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Precio del producto para esta empresa</label>
                <input
                  type="number"
                  value={precioProducto}
                  onChange={(e) =>
                    setPrecioProducto(parseInt(e.target.value) || 0)
                  }
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Orden (posición en planilla)</label>
                <input
                  type="number"
                  value={ordenProducto}
                  onChange={(e) =>
                    setOrdenProducto(parseInt(e.target.value) || 0)
                  }
                  min="0"
                  placeholder="Ej: 1, 2, 3..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddProducto}
                disabled={!selectedProducto}
                className="btn btn-primary"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar precio */}
      {showEditPriceModal && editingProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Editar Precio</h2>
              <button
                onClick={() => setShowEditPriceModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Producto:</strong> {editingProduct.producto?.ProductoNombre}</p>
              <p><strong>Código:</strong> {editingProduct.producto?.ProductoCodigo}</p>
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label>Nuevo Precio</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseInt(e.target.value) || 0)}
                  min="0"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowEditPriceModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePrice}
                className="btn btn-primary"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar orden */}
      {showEditOrderModal && editingOrderProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Editar Orden</h2>
              <button
                onClick={() => setShowEditOrderModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Producto:</strong> {editingOrderProduct.producto?.ProductoNombre}</p>
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label>Orden (número para posicionar)</label>
                <input
                  type="number"
                  value={newOrder}
                  onChange={(e) => setNewOrder(parseInt(e.target.value) || 0)}
                  min="0"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowEditOrderModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch(`/api/empresa-planilla/${editingOrderProduct.EPID}`, {
                      method: "PUT",
                      headers: getAuthHeaders(),
                      body: JSON.stringify({ EPOrden: newOrder }),
                    });
                    setShowEditOrderModal(false);
                    setEditingOrderProduct(null);
                    fetchData();
                  } catch (err) {
                    alert("Error al actualizar orden");
                  }
                }}
                className="btn btn-primary"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
