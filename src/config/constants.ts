import type { Material, Operation } from '../types';

export const MATERIALS: Material[] = [
    {
        id: 'acero-1045',
        name: 'Acero 1045',
        pricePerKg: 1.70,
        density: 7.85, // g/cm³
    },
    {
        id: 'acero-15b30',
        name: 'Acero 15B30',
        pricePerKg: 3.00,
        density: 7.85, // g/cm³
    },
];

export const OPERATIONS: Operation[] = [
    {
        id: 'corte',
        name: 'Corte',
        pricePerUnit: 1.00,
        unit: 'pza',
        type: 'interno',
    },
    {
        id: 'plegado',
        name: 'Plegado',
        pricePerUnit: 0.80,
        unit: 'pza',
        type: 'interno',
    },
    {
        id: 'soldado',
        name: 'Soldado',
        pricePerUnit: 1.50,
        unit: 'pza',
        type: 'interno',
    },
    {
        id: 'pintura',
        name: 'Pintura',
        pricePerUnit: 0.50,
        unit: 'pza',
        type: 'interno',
    },
    {
        id: 'mecanizado',
        name: 'Mecanizado de filo',
        pricePerUnit: 1.00,
        unit: 'pza',
        type: 'interno',
    },
    {
        id: 'tratamiento',
        name: 'Tratamiento Térmico',
        pricePerUnit: 1.50,
        unit: 'kg',
        type: 'tercerizado',
    },
];

export const STATUS_LABELS = {
    pending: 'Pendiente',
    won: 'Ganada',
    lost: 'Perdida',
};
