/**
 * Converts millimeters to the nearest standard inch fraction.
 * Standard fractions: 1/16, 1/8, 3/16, 1/4, 5/16, 3/8, 7/16, 1/2, 9/16, 5/8, 11/16, 3/4, 13/16, 7/8, 15/16, 1
 */
export function mmToInches(mm: number): string {
    const inches = mm / 25.4;

    // Fractions of 16ths
    const sixteenths = Math.round(inches * 16);

    if (sixteenths === 0) return '';

    const wholeInches = Math.floor(sixteenths / 16);
    const remainingSixteenths = sixteenths % 16;

    if (remainingSixteenths === 0) {
        return `${wholeInches}"`;
    }

    // Simplify fraction
    let numerator = remainingSixteenths;
    let denominator = 16;

    while (numerator % 2 === 0 && denominator % 2 === 0) {
        numerator /= 2;
        denominator /= 2;
    }

    const fractionStr = `${numerator}/${denominator}"`;
    return wholeInches > 0 ? `${wholeInches} ${fractionStr}` : fractionStr;
}

/**
 * Formats a thickness value in mm with its nearest inch equivalent in parentheses.
 * Example: 3.2 -> "3.2 mm (1/8\")"
 */
export function formatThickness(mm: number): string {
    if (!mm) return '';
    const inchStr = mmToInches(mm);
    return inchStr ? `${mm} mm (${inchStr})` : `${mm} mm`;
}
