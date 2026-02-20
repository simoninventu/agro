export interface ConfigClient {
    id: string;
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
    address?: string;
    createdAt: string;
}

export interface ConfigBrand {
    id: string;
    name: string;
    createdAt: string;
}

export interface ConfigMachineType {
    id: string;
    name: string;
    createdAt: string;
}

export interface ConfigThickness {
    id: string;
    value: number; // mm
    createdAt: string;
}

export interface ConfigMaterial {
    id: string;
    name: string;
    pricePerKg: number; // USD per kg
    density?: number; // g/cm³ (optional for now)
    createdAt: string;
    updatedAt: string;
}

export interface ConfigService {
    id: string;
    name: string;
    price: number; // USD
    unit: 'pza' | 'kg' | 'm2' | 'm' | 'agujeros' | 'fijo' | 'cantidad'; // por pieza, por kg, por m2, por metro lineal, por agujeros, precio fijo o por cantidad
    provider: 'inventu_lab' | 'externo'; // Inventu Lab o Proveedor externo
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AppConfiguration {
    clients: ConfigClient[];
    brands: ConfigBrand[];
    machineTypes: ConfigMachineType[];
    thicknesses: ConfigThickness[];
    materials: ConfigMaterial[];
    services: ConfigService[];
    version: string;
    lastUpdated: string;
}

export const DEFAULT_CONFIGURATION: AppConfiguration = {
    clients: [],
    brands: [
        { id: 'brand-1', name: 'Metalbert', createdAt: new Date().toISOString() },
        { id: 'brand-2', name: 'Mainero', createdAt: new Date().toISOString() },
        { id: 'brand-3', name: 'Vaima', createdAt: new Date().toISOString() },
        { id: 'brand-4', name: 'Grass Cutter', createdAt: new Date().toISOString() },
        { id: 'brand-5', name: 'Varias', createdAt: new Date().toISOString() },
        { id: 'brand-6', name: 'Georgi', createdAt: new Date().toISOString() },
        { id: 'brand-7', name: 'Oncativo', createdAt: new Date().toISOString() },
    ],
    machineTypes: [
        { id: 'machine-1', name: 'Cuchilla Desmalezadora', createdAt: new Date().toISOString() },
        { id: 'machine-2', name: 'Cuchilla Picadora', createdAt: new Date().toISOString() },
        { id: 'machine-3', name: 'Cuchilla Rolo Trituradora', createdAt: new Date().toISOString() },
        { id: 'machine-4', name: 'Cuchilla Mixer / Roto Cutter', createdAt: new Date().toISOString() },
        { id: 'machine-5', name: 'Reja Cultivadora 11"', createdAt: new Date().toISOString() },
        { id: 'machine-6', name: 'Reja Cultivadora 11" (Acorazada)', createdAt: new Date().toISOString() },
        { id: 'machine-7', name: 'Conjunto Reja Carpidora', createdAt: new Date().toISOString() },
    ],
    thicknesses: [
        { id: 'thick-1', value: 6.35, createdAt: new Date().toISOString() },
        { id: 'thick-2', value: 7.94, createdAt: new Date().toISOString() },
        { id: 'thick-3', value: 9.53, createdAt: new Date().toISOString() },
        { id: 'thick-4', value: 12.7, createdAt: new Date().toISOString() },
    ],
    materials: [],
    services: [],
    version: '1.0.1',
    lastUpdated: new Date().toISOString(),
};
