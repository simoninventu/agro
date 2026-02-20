export interface Material {
  id: string;
  name: string;
  pricePerKg: number;
  density: number; // g/cm³
}

export interface Operation {
  id: string;
  name: string;
  pricePerUnit: number;
  unit: 'pza' | 'kg' | 'm2' | 'fijo' | 'm' | 'agujeros' | 'cantidad';
  type: 'interno' | 'tercerizado';
}

export interface QuotationDimensions {
  length: number;
  width: number;
  thickness: number;
}

export interface QuotationItem {
  id: string;
  type: 'catalog' | 'custom';
  description: string;
  quantity: number;
  baseCost: number; // The base cost before markup
  unitPrice: number; // The price shown to client (baseCost * (1 + markup/100))
  totalPrice: number; // quantity * unitPrice
  catalogProductId?: string;
  catalogProduct?: CatalogProduct;
  markup?: number;
}

export interface QuotationAttachment {
  name: string;
  type: string;
  data: string; // Base64
}

export interface Quotation {
  id: string;
  quotationNumber?: string;
  date: string;
  clientName: string;
  items: QuotationItem[];
  totalPrice: number; // Sum of all items
  paymentTerms: string;
  status?: 'pending' | 'won' | 'lost';
  reason?: string;
  notes?: string;
  attachments?: QuotationAttachment[];
}

export interface QuotationSummary {
  id: string;
  quotationNumber?: string;
  date: string;
  clientName: string;
  productName: string; // Comma-separated names or "Multiple items"
  quantity: number; // Total quantity
  finalPrice: number;
  status?: 'pending' | 'won' | 'lost';
  totalCost: number;
  profit: number;
}

export interface SelectedServiceValue {
  serviceId: string;
  value: number; // The quantity/length/etc.
}

export interface CatalogProduct {
  id: string;
  codigoCompetencia?: string;
  marca: string;
  maquina: string;
  largo: number; // mm
  ancho: number; // mm
  espesor: number; // mm
  peso: number; // kg
  material: string;
  dureza?: string; // HRc range
  tratamientoTermico?: string;
  loteMinimo: number;

  precioUnitario: number; // USD
  planoCompetenciaFile?: string; // Base64
  planoInventuAgroFile?: string; // Base64
  photo?: string; // Base64 - Photo of the product
  selectedServices?: SelectedServiceValue[]; // IDs and values of selected services
  historialVentas: SaleRecord[];
  createdDate?: string;
  lastModified: string;
}

export interface SaleRecord {
  id: string;
  clientName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string;
  notes?: string;
  status: 'pending' | 'won' | 'lost';
  reason?: string;
}
