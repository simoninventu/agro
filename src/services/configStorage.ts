import type {
    AppConfiguration,
    ConfigClient,
    ConfigBrand,
    ConfigMachineType,
    ConfigThickness,
    ConfigMaterial,
    ConfigService,
} from '../types/config';
import { DEFAULT_CONFIGURATION } from '../types/config';
import type { CatalogProduct } from '../types';
import { getCatalogProducts, saveCatalogProduct } from './catalogStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const CONFIG_STORAGE_KEY = 'inventu-agro-config';

/**
 * Get configuration from LocalStorage only (for migration)
 */
export function getLocalConfiguration(): AppConfiguration | null {
    const data = localStorage.getItem(CONFIG_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
}

// Helper to ensure valid UUID or generate one
const ensureUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) ? id : uuidv4();
};

const mapToSupabase = {
    client: (c: ConfigClient) => ({
        id: ensureUUID(c.id),
        name: c.name,
        contact: c.contact,
        email: c.email,
        phone: c.phone,
        address: c.address,
        created_at: c.createdAt
    }),
    brand: (b: ConfigBrand) => ({
        id: ensureUUID(b.id),
        name: b.name,
        created_at: b.createdAt
    }),
    machineType: (m: ConfigMachineType) => ({
        id: ensureUUID(m.id),
        name: m.name,
        created_at: m.createdAt
    }),
    thickness: (t: ConfigThickness) => ({
        id: ensureUUID(t.id),
        value: t.value,
        created_at: t.createdAt
    }),
    material: (m: ConfigMaterial) => ({
        id: ensureUUID(m.id),
        name: m.name,
        price_per_kg: m.pricePerKg,
        density: m.density,
        created_at: m.createdAt,
        updated_at: m.updatedAt
    }),
    service: (s: ConfigService) => ({
        id: ensureUUID(s.id),
        name: s.name,
        price: s.price,
        unit: s.unit,
        provider: s.provider,
        description: s.description,
        created_at: s.createdAt,
        updated_at: s.updatedAt
    })
};

const mapFromSupabase = {
    client: (c: any): ConfigClient => ({
        id: c.id,
        name: c.name,
        contact: c.contact,
        email: c.email,
        phone: c.phone,
        address: c.address,
        createdAt: c.created_at || c.createdAt
    }),
    brand: (b: any): ConfigBrand => ({
        id: b.id,
        name: b.name,
        createdAt: b.created_at || b.createdAt
    }),
    machineType: (m: any): ConfigMachineType => ({
        id: m.id,
        name: m.name,
        createdAt: m.created_at || m.createdAt
    }),
    thickness: (t: any): ConfigThickness => ({
        id: t.id,
        value: t.value || t.thickness,
        createdAt: t.created_at || t.createdAt
    }),
    material: (m: any): ConfigMaterial => ({
        id: m.id,
        name: m.name,
        pricePerKg: m.price_per_kg || m.pricePerKg,
        density: m.density,
        createdAt: m.created_at || m.createdAt,
        updatedAt: m.updated_at || m.updatedAt
    }),
    service: (s: any): ConfigService => ({
        id: s.id,
        name: s.name,
        price: s.price,
        unit: s.unit,
        provider: s.provider,
        description: s.description,
        createdAt: s.created_at || s.createdAt,
        updatedAt: s.updated_at || s.updatedAt
    })
};

/**
 * Get complete configuration
 */
export async function getConfiguration(): Promise<AppConfiguration> {
    try {
        if (isSupabaseConfigured) {
            // Fetch everything in parallel
            const [
                { data: clients, error: e1 },
                { data: brands, error: e2 },
                { data: machines, error: e3 },
                { data: thicknesses, error: e4 },
                { data: materials, error: e5 },
                { data: services, error: e6 }
            ] = await Promise.all([
                supabase.from('clients').select('*'),
                supabase.from('brands').select('*'),
                supabase.from('machine_types').select('*'),
                supabase.from('thicknesses').select('*'),
                supabase.from('materials').select('*'),
                supabase.from('services').select('*')
            ]);

            if (e1 || e2 || e3 || e4 || e5 || e6) {
                console.warn('Some configuration tables could not be loaded from Supabase. Falling back to LocalStorage.', { e1, e2, e3, e4, e5, e6 });
                // Fall through to local storage if supabase fails
            } else {
                return {
                    clients: (clients || []).map(mapFromSupabase.client),
                    brands: (brands || []).map(mapFromSupabase.brand),
                    machineTypes: (machines || []).map(mapFromSupabase.machineType),
                    thicknesses: (thicknesses || []).map(mapFromSupabase.thickness),
                    materials: (materials || []).map(mapFromSupabase.material),
                    services: (services || []).map(mapFromSupabase.service),
                    version: DEFAULT_CONFIGURATION.version,
                    lastUpdated: new Date().toISOString()
                };
            }
        }

        const data = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (data) {
            const config: AppConfiguration = JSON.parse(data);

            // Only merge defaults if version changes
            if (config.version !== DEFAULT_CONFIGURATION.version) {
                let hasChanges = false;

                // Merge brands
                DEFAULT_CONFIGURATION.brands.forEach(defaultBrand => {
                    const exists = config.brands.some(b =>
                        b.name.toLowerCase() === defaultBrand.name.toLowerCase()
                    );
                    if (!exists) {
                        config.brands.push({
                            ...defaultBrand,
                            id: `brand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            createdAt: new Date().toISOString()
                        });
                        hasChanges = true;
                    }
                });

                // Merge machine types
                DEFAULT_CONFIGURATION.machineTypes.forEach(defaultType => {
                    const exists = config.machineTypes.some(mt =>
                        mt.name.toLowerCase() === defaultType.name.toLowerCase()
                    );
                    if (!exists) {
                        config.machineTypes.push({
                            ...defaultType,
                            id: `machine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            createdAt: new Date().toISOString()
                        });
                        hasChanges = true;
                    }
                });

                // Merge thicknesses
                DEFAULT_CONFIGURATION.thicknesses.forEach(defaultThick => {
                    const exists = config.thicknesses.some(t =>
                        t.value === defaultThick.value
                    );
                    if (!exists) {
                        config.thicknesses.push({
                            ...defaultThick,
                            id: `thick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            createdAt: new Date().toISOString()
                        });
                        hasChanges = true;
                    }
                });

                if (hasChanges || config.version !== DEFAULT_CONFIGURATION.version) {
                    config.version = DEFAULT_CONFIGURATION.version;
                    await saveConfiguration(config);
                }
            }

            return config;
        }
        // Initialize with default configuration
        const initialConfig = { ...DEFAULT_CONFIGURATION };
        await saveConfiguration(initialConfig);
        return initialConfig;
    } catch (error) {
        console.error('Error loading configuration:', error);
        return {
            clients: [],
            brands: [],
            machineTypes: [],
            thicknesses: [],
            materials: [],
            services: [],
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
        };
    }
}

/**
 * Save complete configuration
 */
export async function saveConfiguration(config: AppConfiguration): Promise<void> {
    try {
        config.lastUpdated = new Date().toISOString();
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

        if (isSupabaseConfigured) {
            // Upsert everything mapped to snake_case
            await Promise.all([
                ...config.clients.map(c => supabase.from('clients').upsert(mapToSupabase.client(c))),
                ...config.brands.map(b => supabase.from('brands').upsert(mapToSupabase.brand(b))),
                ...config.machineTypes.map(m => supabase.from('machine_types').upsert(mapToSupabase.machineType(m))),
                ...config.thicknesses.map(t => supabase.from('thicknesses').upsert(mapToSupabase.thickness(t))),
                ...config.materials.map(m => supabase.from('materials').upsert(mapToSupabase.material(m))),
                ...config.services.map(s => supabase.from('services').upsert(mapToSupabase.service(s)))
            ]);
        }
    } catch (error) {
        console.error('Error saving configuration:', error);
        throw error;
    }
}

// ==================== CLIENTS ====================

export async function addClient(client: Omit<ConfigClient, 'id' | 'createdAt'>): Promise<ConfigClient> {
    const config = await getConfiguration();
    const newClient: ConfigClient = {
        ...client,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
    };
    config.clients.push(newClient);
    await saveConfiguration(config);
    return newClient;
}

export async function updateClient(id: string, updates: Partial<ConfigClient>): Promise<void> {
    const config = await getConfiguration();
    const index = config.clients.findIndex(c => c.id === id);
    if (index >= 0) {
        config.clients[index] = { ...config.clients[index], ...updates };
        await saveConfiguration(config);
    }
}

export async function deleteClient(id: string): Promise<void> {
    const config = await getConfiguration();
    config.clients = config.clients.filter(c => c.id !== id);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

    if (isSupabaseConfigured) {
        await supabase.from('clients').delete().eq('id', id);
    }
}

// ==================== BRANDS ====================

export async function addBrand(name: string): Promise<ConfigBrand> {
    const config = await getConfiguration();
    const newBrand: ConfigBrand = {
        id: uuidv4(),
        name,
        createdAt: new Date().toISOString(),
    };
    config.brands.push(newBrand);
    await saveConfiguration(config);
    return newBrand;
}

export async function updateBrand(id: string, name: string): Promise<void> {
    const config = await getConfiguration();
    const index = config.brands.findIndex(b => b.id === id);
    if (index >= 0) {
        config.brands[index].name = name;
        await saveConfiguration(config);
    }
}

export async function deleteBrand(id: string): Promise<void> {
    const config = await getConfiguration();
    config.brands = config.brands.filter(b => b.id !== id);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

    if (isSupabaseConfigured) {
        await supabase.from('brands').delete().eq('id', id);
    }
}

// ==================== MACHINE TYPES ====================

export async function addMachineType(name: string): Promise<ConfigMachineType> {
    const config = await getConfiguration();
    const newType: ConfigMachineType = {
        id: uuidv4(),
        name,
        createdAt: new Date().toISOString(),
    };
    config.machineTypes.push(newType);
    await saveConfiguration(config);
    return newType;
}

export async function updateMachineType(id: string, name: string): Promise<void> {
    const config = await getConfiguration();
    const index = config.machineTypes.findIndex(m => m.id === id);
    if (index >= 0) {
        config.machineTypes[index].name = name;
        await saveConfiguration(config);
    }
}

export async function deleteMachineType(id: string): Promise<void> {
    const config = await getConfiguration();
    config.machineTypes = config.machineTypes.filter(m => m.id !== id);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

    if (isSupabaseConfigured) {
        await supabase.from('machine_types').delete().eq('id', id);
    }
}

// ==================== THICKNESSES ====================

export async function addThickness(value: number): Promise<ConfigThickness> {
    const config = await getConfiguration();
    const newThickness: ConfigThickness = {
        id: uuidv4(),
        value,
        createdAt: new Date().toISOString(),
    };
    config.thicknesses.push(newThickness);
    await saveConfiguration(config);
    return newThickness;
}

export async function updateThickness(id: string, value: number): Promise<void> {
    const config = await getConfiguration();
    const index = config.thicknesses.findIndex(t => t.id === id);
    if (index >= 0) {
        config.thicknesses[index].value = value;
        await saveConfiguration(config);
    }
}

export async function deleteThickness(id: string): Promise<void> {
    const config = await getConfiguration();
    config.thicknesses = config.thicknesses.filter(t => t.id !== id);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

    if (isSupabaseConfigured) {
        await supabase.from('thicknesses').delete().eq('id', id);
    }
}

// ==================== MATERIALS ====================

export async function addMaterial(material: Omit<ConfigMaterial, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConfigMaterial> {
    const config = await getConfiguration();
    const newMaterial: ConfigMaterial = {
        ...material,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    config.materials.push(newMaterial);
    await saveConfiguration(config);
    return newMaterial;
}

export async function updateMaterial(id: string, updates: Partial<ConfigMaterial>): Promise<void> {
    const config = await getConfiguration();
    const index = config.materials.findIndex(m => m.id === id);
    if (index >= 0) {
        config.materials[index] = {
            ...config.materials[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        await saveConfiguration(config);
    }
}

export async function deleteMaterial(id: string): Promise<void> {
    const config = await getConfiguration();
    config.materials = config.materials.filter(m => m.id !== id);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

    if (isSupabaseConfigured) {
        await supabase.from('materials').delete().eq('id', id);
    }
}

// ==================== SERVICES ====================

export async function addService(service: Omit<ConfigService, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConfigService> {
    const config = await getConfiguration();
    const newService: ConfigService = {
        ...service,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    config.services.push(newService);
    await saveConfiguration(config);
    return newService;
}

export async function updateService(id: string, updates: Partial<ConfigService>): Promise<void> {
    const config = await getConfiguration();
    const index = config.services.findIndex(s => s.id === id);
    if (index >= 0) {
        config.services[index] = {
            ...config.services[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        await saveConfiguration(config);
    }
}

export async function deleteService(id: string): Promise<void> {
    const config = await getConfiguration();
    config.services = config.services.filter(s => s.id !== id);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

    if (isSupabaseConfigured) {
        await supabase.from('services').delete().eq('id', id);
    }
}

// ==================== PRICE UPDATE HELPERS ====================

/**
 * Get all catalog products that use a specific material
 */
export async function getProductsUsingMaterial(materialName: string): Promise<CatalogProduct[]> {
    const products = await getCatalogProducts();
    return products.filter(p => p.material === materialName);
}

/**
 * Update prices for products when material price changes
 * Returns list of affected products for user review
 */
export interface ProductPriceUpdate {
    product: CatalogProduct;
    oldPrice: number;
    newPrice: number;
}

export async function calculatePriceUpdatesForMaterial(
    materialName: string,
    newPricePerKg: number
): Promise<ProductPriceUpdate[]> {
    const products = await getProductsUsingMaterial(materialName);
    const updates: ProductPriceUpdate[] = [];

    products.forEach(product => {
        const oldPrice = product.precioUnitario;
        // Recalculate material cost based on new price
        const newMaterialCost = product.peso * newPricePerKg;
        // Assuming precioUnitario = materialCost + other costs (we'll need to store this breakdown)
        // const otherCosts = oldPrice - (product.peso * (oldPrice / product.peso)); // This is simplified
        const newPrice = newMaterialCost; // Simplified for now

        if (oldPrice !== newPrice) {
            updates.push({
                product,
                oldPrice,
                newPrice,
            });
        }
    });

    return updates;
}

/**
 * Apply price updates to products
 */
export async function applyPriceUpdates(updates: ProductPriceUpdate[]): Promise<void> {
    for (const { product, newPrice } of updates) {
        const updatedProduct = { ...product, precioUnitario: newPrice };
        await saveCatalogProduct(updatedProduct);
    }
}
