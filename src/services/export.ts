import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Quotation } from '../types';
import { isMonoproducto } from './storage';
import { getConfiguration } from './configStorage';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable: {
            finalY: number;
        };
    }
}

/**
 * Export quotation to PDF
 */
export async function exportToPDF(quotation: Quotation): Promise<void> {
    const doc = new jsPDF();
    const items = quotation.items;

    if (items.length === 0) {
        throw new Error('No se puede exportar: no hay ítems en la cotización');
    }

    const isMono = isMonoproducto(quotation);
    const catalogProduct = isMono ? items[0].catalogProduct : null;
    const config = await getConfiguration();

    // Colors
    const primaryColor: [number, number, number] = [76, 175, 80]; // Green from logo
    const secondaryColor: [number, number, number] = [33, 33, 33]; // Dark grey/black

    // Add Logo
    try {
        const logoUrl = '/inventu-logo.png';
        const img = new Image();
        img.src = logoUrl;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        doc.addImage(img, 'PNG', 20, 15, 60, 20);
    } catch (e) {
        console.error('Could not load logo', e);
        doc.setFontSize(20);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('INVENTU AGRO', 20, 25);
    }

    // Header Info
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${format(new Date(quotation.date), 'dd/MM/yyyy')}`, 190, 20, { align: 'right' });
    const quotationLabel = quotation.quotationNumber || `#${quotation.id.slice(-6).toUpperCase()}`;
    doc.text(`Cotización: ${quotationLabel}`, 190, 26, { align: 'right' });

    // Client Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 20, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(quotation.clientName, 50, 50);

    let currentY = 60;

    if (!isMono) {
        // --- MULTIPRODUCTO VIEW ---
        autoTable(doc, {
            startY: currentY,
            head: [['Detalle', 'Cantidad', 'P. Unitario', 'Subtotal']],
            body: items.map(item => [
                item.description,
                item.quantity.toString(),
                `$${item.unitPrice.toFixed(2)}`,
                `$${item.totalPrice.toFixed(2)}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            margin: { left: 20, right: 20 },
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    } else {
        // --- MONOPRODUCTO VIEW ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('DETALLES DEL PRODUCTO', 20, currentY);
        currentY += 8;

        autoTable(doc, {
            startY: currentY,
            head: [['Especificación', 'Detalle']],
            body: [
                ['Marca', catalogProduct?.marca || ''],
                ['Máquina', catalogProduct?.maquina || ''],
                ['Código / Ref', catalogProduct?.codigoCompetencia || ''],
                ['Material', catalogProduct?.material || ''],
                ['Espesor', `${catalogProduct?.espesor || 0} mm`],
                ['Peso Unitario', `${catalogProduct?.peso || 0} kg`],
                ['Dimensiones', `${catalogProduct?.largo || 0} x ${catalogProduct?.ancho || 0} mm`],
                ['Tratamiento Térmico', catalogProduct?.tratamientoTermico || 'No especificado'],
                ['Dureza', catalogProduct?.dureza || 'No especificada'],
            ],
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 10 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;

        // Processes Table
        if (catalogProduct?.selectedServices && catalogProduct.selectedServices.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text('PROCESOS REQUERIDOS', 20, currentY);
            currentY += 8;

            autoTable(doc, {
                startY: currentY,
                head: [['Proceso', 'Cantidad']],
                body: catalogProduct.selectedServices.map(ss => {
                    const service = config.services.find(s => s.id === ss.serviceId);
                    return [
                        service?.name || 'Servicio',
                        `${ss.value} ${service?.unit || ''}`
                    ];
                }),
                theme: 'striped',
                headStyles: { fillColor: primaryColor },
                margin: { left: 20, right: 20 },
                styles: { fontSize: 10 }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }
    }

    // Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('RESUMEN DE COTIZACIÓN', 20, currentY);

    const summaryY = currentY + 10;
    doc.setFontSize(11);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

    if (!isMono) {
        // Total Price (Multi)
        doc.setFont('helvetica', 'bold');
        doc.text('PRECIO TOTAL FINAL:', 20, summaryY);
        doc.setFontSize(14);
        doc.text(`$${quotation.totalPrice.toFixed(2)} USD + IVA`, 70, summaryY);
    } else {
        // Detailed summary (Mono)
        doc.setFont('helvetica', 'bold');
        doc.text('Precio Unitario:', 20, summaryY);
        doc.setFont('helvetica', 'normal');
        doc.text(`$${items[0].unitPrice.toFixed(2)} USD + IVA`, 70, summaryY);

        doc.setFont('helvetica', 'bold');
        doc.text('Cantidad:', 20, summaryY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${items[0].quantity} unidades`, 70, summaryY + 8);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Precio Final:', 20, summaryY + 18);
        doc.text(`$${quotation.totalPrice.toFixed(2)} USD + IVA`, 70, summaryY + 18);
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Condición de Pago:', 20, summaryY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(quotation.paymentTerms || 'No especificada', 70, summaryY + 30);

    currentY = summaryY + 45;

    // Attachments Note
    if (quotation.attachments && quotation.attachments.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Documentos Adjuntos:', 20, currentY);
        doc.setFont('helvetica', 'normal');
        const attachmentNames = quotation.attachments.map(a => a.name).join(', ');
        doc.text(attachmentNames, 20, currentY + 6, { maxWidth: 170 });
        currentY += 20;
    }

    // Notes
    if (quotation.notes) {
        if (currentY < 270) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.text(`Notas adicionales: ${quotation.notes}`, 20, currentY, { maxWidth: 170 });
        }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Valores expresados en USD (Dólar Oficial Banco Nación)', 105, 280, { align: 'center' });
    doc.text('Inventu Agro - Gracias por confiar en nosotros.', 105, 290, { align: 'center' });

    // Save
    const filename = quotation.quotationNumber || `Cotizacion_${format(new Date(quotation.date), 'yyyyMMdd')}`;
    doc.save(`${filename}.pdf`);
}


