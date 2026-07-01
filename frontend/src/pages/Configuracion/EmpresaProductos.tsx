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
      const [empresaData, productosEmp, productos] = await Promise.all([
        empresasApi.getById(parseInt(id!)),
        fetch(`/api/empresa-planilla?empresaId=${id}`, {
          headers: getAuthHeaders(),
        }).then((r) => r.json()),
        productosApi.getAll({ activo: true }),
      ]);
      setEmpresa(empresaData);
      setProductosEmpresa(productosEmp);
      setProductosDisponibles(productos);
    } catch (err) {
      console.error("Error loading data:", err);
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
        }),
      });
      setShowModal(false);
      setSelectedProducto(0);
      setPrecioProducto(0);
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

  // Filtrar productos que ya están asignados
  const productosAsignados = productosEmpresa.map((pe) => pe.EPProducto);
  const productosSinAsignar = productosDisponibles.filter(
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
      </div>

      {productosEmpresa.length === 0 ? (
        <div className="no-data">
          <p>No hay productos asignados a esta empresa.</p>
          <p>Agregue productos para generar planillas.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosEmpresa.map((pe) => (
              <tr key={pe.EPID} className={!pe.EPActivo ? "row-inactive" : ""}>
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
    </div>
  );
}
