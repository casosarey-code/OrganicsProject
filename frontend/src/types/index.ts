export interface User {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  roles: string[];
  UserEmpresaID?: number;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface Permission {
  id: number;
  name: string;
  resource?: string;
  action?: string;
  description?: string;
}

export interface Empresa {
  EmpresaID: number;
  EmpresaTipo: string;
  EmpresaNombre: string;
  EmpresaDescripcion?: string;
  EmpresaCreaFecha?: string;
  EmpresaCreaUsuario?: string;
  EmpresaDocumento?: string;
  EmpresaNumeroDocumento?: string;
  EmpresaInicioPlantilla?: string;
  EmpresaFinPlantilla?: string;
  EmpresaEnvioCorreo: boolean;
  EmpresaCorreoNotificacion?: string;
  EmpresaEstado: string;
  EmpresaPlanilla?: boolean;
  EmpresaLogo?: string;
  creator?: { id: string; fullName: string };
  _count?: { planillas: number };
}

export interface Producto {
  ProductoID: number;
  ProductoNombre: string;
  ProductoCodigo?: string;
  ProductoPrecio: number;
  ProductoStock: number;
  ProductoActivo: boolean;
}

export interface Planilla {
  PlanillaID: number;
  PlanillaFecha: string;
  PlanillaPuntoVenta: number;
  PlanillaCreaUsuario: string;
  PlanillaCreaFecha: string;
  PlanillaEstado: string;
  PlanillaVentaBruta?: number;
  PlanillaVentaEfectivo?: number;
  PlanillaVentaBancos?: number;
  PlanillaVentaNeta?: number;
  PlanillaVentaBOLD?: number;
  PlanillaVentaNEQUI?: number;
  PlanillaVentaDAVIPLATA?: number;
  PlanillaVentaQR?: number;
  PlanillaAprobFecha?: string;
  PlanillaAprobUser?: string;
  PlanillaFechaVencimiento?: string;
  PlanillaEnvioNotificacion: boolean;
  PlanillaFechaNotificacion?: string;
  puntoVenta?: Empresa;
  creador?: { id: string; fullName: string; email: string };
  aprobUser?: { id: string; fullName: string };
  detalles?: PlanillaDetalle[];
  otros?: PlanillaOtros[];
  _count?: { detalles: number; otros: number };
}

export interface PlanillaDetalle {
  PDID: number;
  PlanillaID: number;
  PDProducto: number;
  PDCantInicial: number;
  PDCantCompra: number;
  PDCantAjuste: number;
  PDCantSubtotal: number;
  PDCantVenta: number;
  PDCantValor: number;
  PDCantFinal: number;
  PDFechaReg: string;
  PDUsuarioReg: string;
  producto?: Producto;
}

export interface PlanillaOtros {
  POID: number;
  PlanillaID: number;
  PODescripcion: string;
  POValor: number;
  POCategoria: string;
  POUrlEvidencia?: string;
  POFechaReg: string;
  POUsuarioReg: string;
}

export interface CreatePlanillaDTO {
  PlanillaFecha?: string;
  PlanillaPuntoVenta: number;
  PlanillaVentaBruta?: number;
  PlanillaVentaEfectivo?: number;
  PlanillaVentaBancos?: number;
  PlanillaVentaNeta?: number;
  PlanillaVentaBOLD?: number;
  PlanillaVentaNEQUI?: number;
  PlanillaVentaDAVIPLATA?: number;
  PlanillaVentaQR?: number;
  detalles?: CreatePlanillaDetalleDTO[];
  otros?: CreatePlanillaOtrosDTO[];
}

export interface CreatePlanillaDetalleDTO {
  PDProducto: number;
  PDCantInicial?: number;
  PDCantCompra?: number;
  PDCantAjuste?: number;
  PDCantVenta?: number;
  PDCantValor?: number;
}

export interface CreatePlanillaOtrosDTO {
  PODescripcion: string;
  POValor: number;
  POCategoria: string;
  POUrlEvidencia?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  username?: string;
  password: string;
  fullName?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}
