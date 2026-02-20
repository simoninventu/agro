import type { Quotation } from '../types';

/**
 * Generate the date-based prefix for quotation number
 * Format: InventuAgroYYMMDD
 * @param date - Date object or ISO string
 * @returns Prefix string like "InventuAgro260210"
 */
export function generateQuotationPrefix(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    const year = d.getFullYear().toString().slice(-2); // Last 2 digits of year
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');

    return `InventuAgro${year}${month}${day}`;
}

/**
 * Get the next sequential number for quotations on a given date
 * @param existingQuotations - All existing quotations
 * @param date - Date to check
 * @returns Next sequential number (1-based)
 */
export function getNextSequentialNumber(
    existingQuotations: Quotation[],
    date: Date | string
): number {
    const prefix = generateQuotationPrefix(date);

    // Filter quotations with the same date prefix
    const quotationsOnDate = existingQuotations.filter(q =>
        q.quotationNumber && q.quotationNumber.startsWith(prefix)
    );

    if (quotationsOnDate.length === 0) {
        return 1;
    }

    // Extract the sequential numbers and find the max
    const sequentialNumbers = quotationsOnDate
        .map(q => {
            const match = q.quotationNumber?.split('-').pop();
            return match ? parseInt(match, 10) : 0;
        })
        .filter(n => !isNaN(n) && n > 0);

    const maxNumber = sequentialNumbers.length > 0 ? Math.max(...sequentialNumbers) : 0;
    return maxNumber + 1;
}

/**
 * Generate a complete quotation number
 * Format: InventuAgroYYMMDD-NN
 * @param existingQuotations - All existing quotations
 * @param date - Date for the quotation
 * @returns Complete quotation number like "InventuAgro260210-01"
 */
export function generateQuotationNumber(
    existingQuotations: Quotation[],
    date: Date | string
): string {
    const prefix = generateQuotationPrefix(date);
    const sequentialNumber = getNextSequentialNumber(existingQuotations, date);
    const formattedNumber = sequentialNumber.toString().padStart(2, '0');

    return `${prefix}-${formattedNumber}`;
}

/**
 * Extract date information from a quotation number
 * @param quotationNumber - Quotation number like "InventuAgro260210-01"
 * @returns Date object or null if invalid format
 */
export function parseDateFromQuotationNumber(quotationNumber: string): Date | null {
    const match = quotationNumber.match(/InventuAgro(\d{2})(\d{2})(\d{2})-\d{2}$/);

    if (!match) {
        return null;
    }

    const [, year, month, day] = match;
    const fullYear = 2000 + parseInt(year, 10);
    const monthIndex = parseInt(month, 10) - 1;
    const dayNum = parseInt(day, 10);

    return new Date(fullYear, monthIndex, dayNum);
}
