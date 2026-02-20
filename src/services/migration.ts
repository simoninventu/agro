import { supabase } from '../lib/supabase';
import { getLocalConfiguration } from './configStorage';
import { getLocalCatalogProducts } from './catalogStorage';
import { getLocalQuotations } from './storage';
import { v4 as uuidv4 } from 'uuid';
import type { SaleRecord } from '../types';

/**
 * Migration utility to move data from LocalStorage to Supabase
 */
export async function migrateToSupabase() {
    console.log('Starting migration to Supabase...');

    // ID Mapping maps to preserve relations
    const productIdMap = new Map<string, string>();

    // 1. Migrate Configuration from LOCAL storage specifically
    const config = getLocalConfiguration();

    if (config) {
        // Map and migrate each collection
        if (config.brands && config.brands.length > 0) {
            await supabase.from('brands').upsert(
                config.brands.map(b => ({
                    id: b.id.includes('brand-') ? uuidv4() : b.id,
                    name: b.name,
                    created_at: b.createdAt
                }))
            );
        }

        if (config.machineTypes && config.machineTypes.length > 0) {
            await supabase.from('machine_types').upsert(
                config.machineTypes.map(m => ({
                    id: m.id.includes('machine-') ? uuidv4() : m.id,
                    name: m.name,
                    created_at: m.createdAt
                }))
            );
        }

        if (config.thicknesses && config.thicknesses.length > 0) {
            await supabase.from('thicknesses').upsert(
                config.thicknesses.map(t => ({
                    id: t.id.includes('thick-') ? uuidv4() : t.id,
                    value: t.value,
                    created_at: t.createdAt
                }))
            );
        }

        if (config.materials && config.materials.length > 0) {
            await supabase.from('materials').upsert(
                config.materials.map(m => ({
                    id: m.id.includes('material-') ? uuidv4() : m.id,
                    name: m.name,
                    price_per_kg: m.pricePerKg,
                    density: m.density,
                    created_at: m.createdAt,
                    updated_at: m.updatedAt
                }))
            );
        }

        if (config.services && config.services.length > 0) {
            await supabase.from('services').upsert(
                config.services.map(s => ({
                    id: s.id.includes('service-') ? uuidv4() : s.id,
                    name: s.name,
                    price: s.price,
                    unit: s.unit,
                    provider: s.provider,
                    description: s.description,
                    created_at: s.createdAt,
                    updated_at: s.updatedAt
                }))
            );
        }

        if (config.clients && config.clients.length > 0) {
            await supabase.from('clients').upsert(
                config.clients.map(c => ({
                    id: c.id.includes('client-') ? uuidv4() : c.id,
                    name: c.name,
                    contact: c.contact,
                    email: c.email,
                    phone: c.phone,
                    address: c.address,
                    created_at: c.createdAt
                }))
            );
        }
    }

    // 2. Migrate Catalog Products
    const localProducts = getLocalCatalogProducts();
    for (const p of localProducts) {
        const product_id = p.id.includes('cat-') ? uuidv4() : p.id;
        productIdMap.set(p.id, product_id); // Store the mapping

        await supabase.from('catalog_products').upsert({
            id: product_id,
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
            last_modified: p.lastModified
        });

        // Migrate sales history if any
        if (p.historialVentas && p.historialVentas.length > 0) {
            await supabase.from('sale_records').upsert(
                p.historialVentas.map((s: SaleRecord) => ({
                    id: s.id.includes('sale-') ? uuidv4() : s.id,
                    product_id: product_id,
                    client_name: s.clientName,
                    quantity: s.quantity,
                    unit_price: s.unitPrice,
                    total_price: s.totalPrice,
                    date: s.date,
                    notes: s.notes,
                    status: s.status,
                    reason: s.reason
                }))
            );
        }
    }

    // 3. Migrate Quotations
    const localQuotations = getLocalQuotations();
    for (const q of localQuotations) {
        // Resolve new product ID from map
        const newProductId = productIdMap.get(q.catalogProductId) || q.catalogProductId;

        await supabase.from('quotations').upsert({
            id: q.id.startsWith('Q') || q.id.includes('-') === false ? uuidv4() : q.id,
            date: q.date,
            client_name: q.clientName,
            catalog_product_id: newProductId,
            quantity: q.quantity,
            base_cost: (q as any).base_cost !== undefined ? (q as any).base_cost : q.baseCost,
            markup: q.markup,
            final_price: q.finalPrice,
            payment_terms: q.paymentTerms,
            status: q.status,
            reason: q.reason,
            notes: q.notes
        });
    }

    console.log('Migration completed!');
    return true;
}
