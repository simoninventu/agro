import type { Quotation, QuotationSummary, QuotationItem, QuotationAttachment } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const mapToSupabaseQuotation = (q: Quotation) => ({
    id: q.id,
    quotation_number: q.quotationNumber,
    date: q.date,
    client_name: q.clientName,
    // For legacy support, we store the first item's product ID if it's a catalog item
    catalog_product_id: q.items.find(item => item.type === 'catalog')?.catalogProductId,
    quantity: q.items.reduce((sum, item) => sum + item.quantity, 0),
    base_cost: q.items.reduce((sum, item) => sum + ((item.baseCost || item.unitPrice) * item.quantity), 0) / (q.items.reduce((sum, item) => sum + item.quantity, 0) || 1),
    markup: q.items[0]?.markup || 0,
    final_price: q.totalPrice,
    payment_terms: q.paymentTerms,
    status: q.status,
    reason: q.reason,
    notes: q.notes,
    // If Supabase supports it, we could add 'items' and 'attachments' columns as JSON
    // for now we'll rely on localStorage for the full structure if Supabase isn't updated
    items: JSON.stringify(q.items),
    attachments: JSON.stringify(q.attachments || [])
});

const normalizeQuotation = (q: any): Quotation => {
    let items: QuotationItem[] = [];
    try {
        if (q.items) {
            items = typeof q.items === 'string' ? JSON.parse(q.items) : q.items;
        } else if (q.catalog_product || q.catalog_product_id) {
            // Legacy Supabase format
            items = [{
                id: uuidv4(),
                type: 'catalog',
                description: q.catalog_product ? `${q.catalog_product.codigo_competencia} - ${q.catalog_product.marca}` : 'Producto',
                quantity: q.quantity || 0,
                unitPrice: Number(q.final_price || q.final_price) / (q.quantity || 1),
                totalPrice: Number(q.final_price || q.totalPrice || 0),
                catalogProductId: q.catalog_product_id,
                catalogProduct: q.catalog_product ? {
                    id: q.catalog_product.id,
                    codigoCompetencia: q.catalog_product.codigo_competencia,
                    marca: q.catalog_product.marca,
                    maquina: q.catalog_product.maquina,
                    largo: Number(q.catalog_product.largo),
                    ancho: Number(q.catalog_product.ancho),
                    espesor: Number(q.catalog_product.espesor),
                    peso: Number(q.catalog_product.peso),
                    material: q.catalog_product.material,
                    dureza: q.catalog_product.dureza,
                    tratamientoTermico: q.catalog_product.tratamiento_termico,
                    precioUnitario: Number(q.catalog_product.precio_unitario),
                    loteMinimo: q.catalog_product.lote_minimo,
                    photo: q.catalog_product.photo_url,
                    planoCompetenciaFile: q.catalog_product.plano_competencia_url,
                    planoInventuAgroFile: q.catalog_product.plano_inventu_url,
                    historialVentas: [],
                    createdDate: q.catalog_product.created_at,
                    lastModified: q.catalog_product.last_modified
                } : undefined,
                baseCost: Number(q.catalog_product?.precio_unitario || q.base_cost || (Number(q.final_price) / (q.quantity || 1))),
                markup: Number(q.markup || 0)
            }];
        } else if (q.productName || q.finalPrice) {
            // Legacy LocalStorage format (pre multi-item)
            items = [{
                id: uuidv4(),
                type: 'catalog',
                description: q.productName || 'Producto',
                quantity: q.quantity || 1,
                baseCost: Number(q.basePrice || q.baseCost || (Number(q.finalPrice || 0) / (q.quantity || 1))),
                unitPrice: Number(q.finalPrice || 0) / (q.quantity || 1),
                totalPrice: Number(q.finalPrice || 0),
                catalogProductId: q.productId,
                markup: q.markup || 0
            }];
        }

        // Ensure every item has a baseCost
        items = items.map(item => {
            if (item.baseCost !== undefined && item.baseCost !== 0) return item;

            let baseCost = item.unitPrice; // default fallback
            if (item.type === 'catalog' && item.catalogProduct) {
                baseCost = item.catalogProduct.precioUnitario;
            } else if (item.markup && item.markup > 0) {
                baseCost = item.unitPrice / (1 + item.markup / 100);
            }

            return { ...item, baseCost };
        });
    } catch (e) {
        console.error('Error normalizing items:', e);
    }

    let attachments: QuotationAttachment[] = [];
    try {
        if (q.attachments) {
            attachments = typeof q.attachments === 'string' ? JSON.parse(q.attachments) : q.attachments;
        }
    } catch (e) {
        console.error('Error normalizing attachments:', e);
    }

    return {
        id: q.id,
        quotationNumber: q.quotationNumber || q.quotation_number,
        date: q.date,
        clientName: q.clientName || q.client_name,
        items,
        totalPrice: Number(q.totalPrice || q.final_price || q.finalPrice || 0),
        paymentTerms: q.paymentTerms || q.payment_terms,
        status: q.status,
        reason: q.reason,
        notes: q.notes,
        attachments
    };
};

export const STORAGE_KEY = 'inventu_quotations';

/**
 * Get quotations from LocalStorage only (for migration)
 */
export function getLocalQuotations(): Quotation[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data).map(normalizeQuotation) : [];
}

/**
 * Get all quotations
 */
export async function getQuotations(): Promise<Quotation[]> {
    try {
        let supabaseQuotations: Quotation[] = [];
        let localQuotations: Quotation[] = [];

        // Try Supabase first if available
        if (isSupabaseConfigured) {
            try {
                const { data, error } = await supabase
                    .from('quotations')
                    .select('*, catalog_product:catalog_product_id(*)');

                if (!error && data) {
                    supabaseQuotations = data.map(normalizeQuotation);
                    console.log(`✅ Loaded ${supabaseQuotations.length} quotations from Supabase`);
                } else if (error) {
                    console.warn('⚠️ Supabase fetch failed:', error.message);
                }
            } catch (error) {
                console.warn('⚠️ Supabase fetch error:', error);
            }
        }

        // Always also check localStorage
        const localData = localStorage.getItem(STORAGE_KEY);
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                localQuotations = Array.isArray(parsed) ? parsed.map(normalizeQuotation) : [];
                console.log(`📦 Loaded ${localQuotations.length} quotations from localStorage`);
            } catch (e) {
                console.error('Error parsing localStorage quotas:', e);
            }
        }

        // Merge: Use localStorage as source of truth, add Supabase items not in localStorage
        const mergedMap = new Map<string, Quotation>();

        // Add Supabase quotations first
        supabaseQuotations.forEach(q => mergedMap.set(q.id, q));

        // Override/add with localStorage (localStorage takes precedence)
        localQuotations.forEach(q => mergedMap.set(q.id, q));

        const merged = Array.from(mergedMap.values());
        console.log(`🔄 Total quotations after merge: ${merged.length}`);

        return merged;
    } catch (error) {
        console.error('❌ Error loading quotations:', error);
        return [];
    }
}

/**
 * Save quotation
 */
export async function saveQuotation(quotation: Quotation): Promise<void> {
    try {
        // Try Supabase
        if (isSupabaseConfigured) {
            const { error } = await supabase
                .from('quotations')
                .upsert(mapToSupabaseQuotation(quotation));

            if (!error) {
                console.log('✅ Quotation saved to Supabase:', quotation.id);
                // Also save to localStorage as backup
                const quotations = getLocalQuotations();
                const index = quotations.findIndex(q => q.id === quotation.id);
                if (index >= 0) {
                    quotations[index] = quotation;
                } else {
                    quotations.push(quotation);
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
                return;
            }
            console.warn('⚠️ Supabase save failed, using localStorage:', error.message);
        }

        // Local Storage (fallback or primary)
        const quotations = getLocalQuotations();
        const index = quotations.findIndex(q => q.id === quotation.id);

        if (index >= 0) {
            quotations[index] = quotation;
            console.log('📝 Quotation updated in localStorage:', quotation.id);
        } else {
            quotations.push(quotation);
            console.log('📝 New quotation saved to localStorage:', quotation.id);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));

        // Verify the save
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            throw new Error('Failed to save to localStorage');
        }
        const parsed = JSON.parse(saved);
        const found = parsed.find((q: Quotation) => q.id === quotation.id);
        if (!found) {
            throw new Error('Quotation not found after save');
        }
        console.log('✅ Quotation save verified');
    } catch (error) {
        console.error('❌ Error saving quotation:', error);
        throw error;
    }
}

/**
 * Delete quotation
 */
export async function deleteQuotation(id: string): Promise<void> {
    try {
        let supabaseDeleted = false;
        if (isSupabaseConfigured) {
            try {
                const { error } = await supabase.from('quotations').delete().eq('id', id);
                if (!error) {
                    console.log('✅ Quotation deleted from Supabase:', id);
                    supabaseDeleted = true;
                } else {
                    console.warn('⚠️ Supabase deletion failed:', error.message);
                }
            } catch (err) {
                console.warn('⚠️ Supabase deletion error:', err);
            }
        }

        // Always remove from localStorage
        const localData = localStorage.getItem(STORAGE_KEY);
        if (localData) {
            const quotations: Quotation[] = JSON.parse(localData);
            const filtered = quotations.filter(q => q.id !== id);

            if (filtered.length < quotations.length) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
                console.log('📝 Quotation removed from localStorage:', id);
            }
        }

        if (!supabaseDeleted && isSupabaseConfigured) {
            // Optional: we could throw if both failed, but clearing local is usually what the user wants to see
        }
    } catch (error) {
        console.error('❌ Error during quotation deletion:', error);
        throw error;
    }
}

/**
 * Get quotation by ID
 */
export async function getQuotationById(id: string): Promise<Quotation | undefined> {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase
            .from('quotations')
            .select('*, catalog_product:catalog_product_id(*)')
            .eq('id', id)
            .single();
        if (!error && data) return normalizeQuotation(data);
    }
    return (await getQuotations()).find(q => q.id === id);
}

/**
 * Get quotation summaries
 */
export async function getQuotationSummaries(): Promise<QuotationSummary[]> {
    const quotations = await getQuotations();
    return quotations.map(q => {
        const productNames = q.items.map(item => item.description).join(', ');
        const totalQuantity = q.items.reduce((sum, item) => sum + item.quantity, 0);

        // Calculate total cost for profit calculation
        const totalCost = q.items.reduce((sum, item) => {
            return sum + ((item.baseCost || 0) * item.quantity);
        }, 0);

        return {
            id: q.id,
            quotationNumber: q.quotationNumber,
            date: q.date,
            clientName: q.clientName,
            productName: productNames.length > 50 ? `${productNames.slice(0, 47)}...` : productNames || 'Sin ítems',
            quantity: totalQuantity,
            finalPrice: q.totalPrice,
            status: q.status,
            totalCost: totalCost,
            profit: q.totalPrice - totalCost
        };
    });
}

/**
 * Update quotation status
 */
export async function updateQuotationStatus(
    id: string,
    status: 'won' | 'lost',
    reason?: string
): Promise<void> {
    try {
        if (isSupabaseConfigured) {
            try {
                const { error } = await supabase
                    .from('quotations')
                    .update({ status, reason })
                    .eq('id', id);

                if (!error) {
                    console.log('✅ Quotation status updated in Supabase:', id);
                } else {
                    console.warn('⚠️ Supabase status update failed:', error.message);
                }
            } catch (err) {
                console.warn('⚠️ Supabase status update error:', err);
            }
        }

        // Always update LocalStorage too
        const quotation = await getQuotationById(id);
        if (!quotation) {
            throw new Error('Quotation not found');
        }

        quotation.status = status;
        quotation.reason = reason;

        await saveQuotation(quotation);
        console.log('📝 Quotation status updated in LocalStorage:', id);
    } catch (error) {
        console.error('❌ Error updating quotation status:', error);
        throw error;
    }
}

/**
 * Check if a quotation is a single catalog product
 */
export function isMonoproducto(quotation: Quotation): boolean {
    return quotation.items.length === 1 && quotation.items[0].type === 'catalog' && !!quotation.items[0].catalogProduct;
}
