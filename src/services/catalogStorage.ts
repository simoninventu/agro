import type { CatalogProduct, SaleRecord } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const mapToSupabaseProduct = (p: CatalogProduct) => ({
    id: p.id,
    codigo_competencia: p.codigoCompetencia,
    marca: p.marca,
    maquina: p.maquina,
    largo: p.largo,
    ancho: p.ancho,
    espesor: p.espesor,
    peso: p.peso,
    material: p.material,
    dureza: p.dureza,
    tratamiento_termico: p.tratamientoTermico,
    lote_minimo: p.loteMinimo,
    precio_unitario: p.precioUnitario,
    photo_url: p.photo,
    plano_competencia_url: p.planoCompetenciaFile,
    plano_inventu_url: p.planoInventuAgroFile,
    selected_services: p.selectedServices,
    last_modified: p.lastModified || new Date().toISOString()
});

const mapFromSupabaseProduct = (p: any): CatalogProduct => ({
    id: p.id,
    codigoCompetencia: p.codigo_competencia,
    marca: p.marca,
    maquina: p.maquina,
    largo: Number(p.largo),
    ancho: Number(p.ancho),
    espesor: Number(p.espesor),
    peso: Number(p.peso),
    material: p.material,
    dureza: p.dureza,
    tratamientoTermico: p.tratamiento_termico,
    loteMinimo: p.lote_minimo,
    precioUnitario: Number(p.precio_unitario),
    photo: p.photo_url,
    planoCompetenciaFile: p.plano_competencia_url,
    planoInventuAgroFile: p.plano_inventu_url,
    selectedServices: p.selected_services || [],
    historialVentas: [], // Handled separately or as join
    createdDate: p.created_at,
    lastModified: p.last_modified
});

export const CATALOG_STORAGE_KEY = 'inventu-agro-catalog';

/**
 * Get catalog products from LocalStorage only (for migration)
 */
export function getLocalCatalogProducts(): CatalogProduct[] {
    const data = localStorage.getItem(CATALOG_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export async function saveCatalogProduct(product: CatalogProduct): Promise<void> {
    const updatedProduct = {
        ...product,
        lastModified: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
        const supabaseData = mapToSupabaseProduct(updatedProduct);
        const { error } = await supabase.from('catalog_products').upsert(supabaseData);

        if (error) {
            console.error('Supabase catalog save error:', error);
            // Error code 42703 is "undefined_column" in PostgreSQL
            // Error code PGRST204 is "schema cache error" in PostgREST
            if ((error.code === '42703' || error.code === 'PGRST204') && 'selected_services' in supabaseData) {
                console.warn('Column "selected_services" missing in Supabase. Retrying without it...');
                const { selected_services, ...fallbackData } = supabaseData;
                const { error: retryError } = await supabase.from('catalog_products').upsert(fallbackData);
                if (retryError) {
                    console.error('Supabase fallback save error:', retryError);
                    // We don't throw here yet, we still want to save to localStorage
                } else {
                    console.log('Product saved successfully to Supabase without selected_services');
                }
            }
        } else {
            console.log('✅ Product saved to Supabase:', product.id);
        }
    }

    // Always save to localStorage to ensure services and other fields are preserved
    const products = getLocalCatalogProducts();
    const existingIndex = products.findIndex(p => p.id === product.id);

    if (existingIndex >= 0) {
        products[existingIndex] = updatedProduct;
        console.log('📝 Product updated in localStorage:', product.id);
    } else {
        products.push(updatedProduct);
        console.log('📝 New product saved to localStorage:', product.id);
    }

    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(products));
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
    try {
        let supabaseProducts: CatalogProduct[] = [];
        let localProducts: CatalogProduct[] = [];

        if (isSupabaseConfigured) {
            const { data, error } = await supabase.from('catalog_products').select('*');
            if (!error && data) {
                supabaseProducts = data.map(mapFromSupabaseProduct);
                console.log(`✅ Loaded ${supabaseProducts.length} products from Supabase`);
            } else if (error) {
                console.warn('⚠️ Supabase catalog fetch failed:', error.message);
            }
        }

        const data = localStorage.getItem(CATALOG_STORAGE_KEY);
        if (data) {
            try {
                localProducts = JSON.parse(data);
                console.log(`📦 Loaded ${localProducts.length} products from localStorage`);
            } catch (e) {
                console.error('Error parsing catalog products:', e);
            }
        }

        // Merge: localStorage takes precedence for fields like selectedServices
        const mergedMap = new Map<string, CatalogProduct>();

        supabaseProducts.forEach(p => mergedMap.set(p.id, p));
        localProducts.forEach(p => mergedMap.set(p.id, p));

        const merged = Array.from(mergedMap.values());
        console.log(`🔄 Total catalog products after merge: ${merged.length}`);

        return merged;
    } catch (error) {
        console.error('❌ Error loading catalog products:', error);
        return getLocalCatalogProducts();
    }
}

export async function getCatalogProductById(id: string): Promise<CatalogProduct | null> {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('catalog_products').select('*').eq('id', id).single();
        if (!error && data) return mapFromSupabaseProduct(data);
    }
    const products = await getCatalogProducts();
    return products.find(p => p.id === id) || null;
}

export async function deleteCatalogProduct(id: string): Promise<void> {
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('catalog_products').delete().eq('id', id);
            if (!error) {
                console.log('✅ Product deleted from Supabase:', id);
            } else {
                console.warn('⚠️ Supabase product deletion failed:', error.message);
            }
        } catch (err) {
            console.warn('⚠️ Supabase deletion error:', err);
        }
    }

    // Always remove from localStorage
    const products = getLocalCatalogProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length < products.length) {
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(filtered));
        console.log('📝 Product removed from localStorage:', id);
    }
}

export async function addSaleRecord(productId: string, sale: SaleRecord): Promise<void> {
    const products = await getCatalogProducts();
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex >= 0) {
        products[productIndex].historialVentas.push(sale);
        products[productIndex].lastModified = new Date().toISOString();
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(products));

        // Update Supabase if configured
        if (isSupabaseConfigured) {
            // In a real scenario, we'd have a separate sales table
            // For now, if storing as JSON in catalog_products, we update the whole record
            await saveCatalogProduct(products[productIndex]);
        }
    }
}

export async function updateSaleRecord(productId: string, saleId: string, updatedSale: SaleRecord): Promise<void> {
    const products = await getCatalogProducts();
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex >= 0) {
        const saleIndex = products[productIndex].historialVentas.findIndex(s => s.id === saleId);
        if (saleIndex >= 0) {
            products[productIndex].historialVentas[saleIndex] = updatedSale;
            products[productIndex].lastModified = new Date().toISOString();
            localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(products));

            if (isSupabaseConfigured) {
                await saveCatalogProduct(products[productIndex]);
            }
        }
    }
}

export async function deleteSaleRecord(productId: string, saleId: string): Promise<void> {
    const products = await getCatalogProducts();
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex >= 0) {
        products[productIndex].historialVentas = products[productIndex].historialVentas.filter(s => s.id !== saleId);
        products[productIndex].lastModified = new Date().toISOString();
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(products));

        if (isSupabaseConfigured) {
            await saveCatalogProduct(products[productIndex]);
        }
    }
}
