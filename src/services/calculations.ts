import type { Material, Operation, QuotationDimensions } from '../types';

/**
 * Calculate weight in kg based on dimensions (mm) and material density
 */
export function calculateWeight(
    dimensions: QuotationDimensions,
    material: Material
): number {
    const { length, width, thickness } = dimensions;

    // Convert mm to cm
    const lengthCm = length / 10;
    const widthCm = width / 10;
    const thicknessCm = thickness / 10;

    // Volume in cm³
    const volumeCm3 = lengthCm * widthCm * thicknessCm;

    // Weight = volume × density
    // Heuristic: If density is > 100, assume it's kg/m³ and convert to g/cm³
    const density = material.density > 100 ? material.density / 1000 : material.density;
    const weightG = volumeCm3 * density;

    // Convert to kg
    return weightG / 1000;
}

/**
 * Calculate material cost
 */
export function calculateMaterialCost(
    weight: number,
    material: Material,
    quantity: number
): number {
    return weight * material.pricePerKg * quantity;
}

/**
 * Calculate operations cost
 */
export function calculateOperationsCost(
    operations: Operation[],
    weight: number,
    quantity: number,
    dimensions?: QuotationDimensions
): number {
    return operations.reduce((total, op) => {
        let unitValue = 1;

        if (op.unit === 'kg') {
            unitValue = weight;
        } else if (op.unit === 'm2') {
            if (dimensions) {
                // Area de las 6 caras del prisma rectangular en m2: 2 * (L*W + L*H + W*H) / 1,000,000
                const { length, width, thickness } = dimensions;
                unitValue = 2 * (length * width + length * thickness + width * thickness) / 1000000;
            } else {
                console.warn('Dimensions required for m2 calculation but not provided');
                unitValue = 0;
            }
        }

        return total + op.pricePerUnit * unitValue * quantity;
    }, 0);
}

/**
 * Calculate Inventu Lab cost (internal operations only)
 */
export function calculateInventuLabCost(
    operations: Operation[],
    weight: number,
    quantity: number,
    dimensions?: QuotationDimensions
): number {
    const internalOps = operations.filter(op => op.type === 'interno');
    return calculateOperationsCost(internalOps, weight, quantity, dimensions);
}

/**
 * Calculate total cost
 */
export function calculateTotalCost(
    materialCost: number,
    operationsCost: number
): number {
    return materialCost + operationsCost;
}
