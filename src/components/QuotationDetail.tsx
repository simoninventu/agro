import { useState, useEffect } from 'react';
import { X, FileDown, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Quotation } from '../types';
import { updateQuotationStatus, isMonoproducto } from '../services/storage';
import { getConfiguration } from '../services/configStorage';
import { exportToPDF } from '../services/export';
import { useToast } from './Toast';
import type { ConfigService } from '../types/config';

interface QuotationDetailProps {
    quotation: Quotation;
    onClose: () => void;
}

export function QuotationDetail({ quotation, onClose }: QuotationDetailProps) {
    const { showToast } = useToast();
    const [showStatusUpdate, setShowStatusUpdate] = useState(false);
    const [newStatus, setNewStatus] = useState<'won' | 'lost'>('won');
    const [reason, setReason] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [services, setServices] = useState<ConfigService[]>([]);

    useEffect(() => {
        getConfiguration().then(config => setServices(config.services));
    }, []);

    const isMono = isMonoproducto(quotation);
    const catalogProduct = isMono ? quotation.items[0].catalogProduct : null;

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            await exportToPDF(quotation);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            showToast('Error al generar el PDF', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleUpdateStatus = async () => {
        await updateQuotationStatus(quotation.id, newStatus, reason);
        showToast(`Cotización marcada como ${newStatus === 'won' ? 'ganada' : 'perdida'}`);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Detalle de Cotización {quotation.quotationNumber}</h3>
                    <button className="btn btn-outline btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* ID, Date and Client */}
                    <div className="grid grid-2 mb-lg">
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                Fecha
                            </p>
                            <p style={{ fontWeight: 600 }}>{format(new Date(quotation.date), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                Cliente
                            </p>
                            <p style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--color-primary)' }}>{quotation.clientName}</p>
                        </div>
                    </div>

                    {/* Items List - Conditional View */}
                    {!isMono ? (
                        <div className="mb-lg">
                            <h4 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Ítems</h4>
                            <div className="table-container">
                                <table className="table no-hover">
                                    <thead>
                                        <tr>
                                            <th>Descripción</th>
                                            <th>Cantidad</th>
                                            <th>P. Unitario</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quotation.items?.map((item) => (
                                            <tr key={item.id}>
                                                <td style={{ fontSize: '0.875rem' }}>{item.description}</td>
                                                <td>{item.quantity}</td>
                                                <td>${item.unitPrice.toFixed(2)}</td>
                                                <td className="font-600">${item.totalPrice.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3} className="text-right font-600">Total (+ IVA):</td>
                                            <td className="font-700 color-primary" style={{ fontSize: '1.1rem' }}>${quotation.totalPrice.toFixed(2)} USD</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Technical Specs for Single Product */}
                            <div className="mb-lg">
                                <h4 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-secondary)' }}>DETALLES DEL PRODUCTO</h4>
                                <div className="table-container">
                                    <table className="table no-hover table-sm">
                                        <thead>
                                            <tr>
                                                <th style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Especificación</th>
                                                <th style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Detalle</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>Marca</td><td>{catalogProduct?.marca}</td></tr>
                                            <tr><td>Máquina</td><td>{catalogProduct?.maquina}</td></tr>
                                            <tr><td>Código / Ref</td><td>{catalogProduct?.codigoCompetencia}</td></tr>
                                            <tr><td>Material</td><td>{catalogProduct?.material}</td></tr>
                                            <tr><td>Espesor</td><td>{catalogProduct?.espesor} mm</td></tr>
                                            <tr><td>Peso Unitario</td><td>{catalogProduct?.peso} kg</td></tr>
                                            <tr><td>Dimensiones</td><td>{catalogProduct?.largo} x {catalogProduct?.ancho} mm</td></tr>
                                            <tr><td>Tratamiento Térmico</td><td>{catalogProduct?.tratamientoTermico || 'No especificado'}</td></tr>
                                            <tr><td>Dureza</td><td>{catalogProduct?.dureza || 'No especificada'}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Processes for Single Product */}
                            {catalogProduct?.selectedServices && catalogProduct.selectedServices.length > 0 && (
                                <div className="mb-lg">
                                    <h4 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-secondary)' }}>PROCESOS REQUERIDOS</h4>
                                    <div className="table-container">
                                        <table className="table no-hover table-sm">
                                            <thead>
                                                <tr>
                                                    <th style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Proceso</th>
                                                    <th style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Cantidad</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {catalogProduct.selectedServices.map(ss => {
                                                    const service = services.find(s => s.id === ss.serviceId);
                                                    return (
                                                        <tr key={ss.serviceId}>
                                                            <td>{service?.name || 'Servicio'}</td>
                                                            <td>{ss.value} {service?.unit}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Summary for Single Product */}
                            <div className="mb-lg">
                                <h4 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-secondary)' }}>RESUMEN DE COTIZACIÓN</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                                    <div className="flex justify-between">
                                        <span className="font-600">Precio Unitario:</span>
                                        <span>${quotation.items[0].unitPrice.toFixed(2)} USD + IVA</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-600">Cantidad:</span>
                                        <span>{quotation.items[0].quantity} unidades</span>
                                    </div>
                                    <div className="flex justify-between border-top pt-sm">
                                        <span className="font-700 color-primary" style={{ fontSize: '1.2rem' }}>Precio Final:</span>
                                        <span className="font-700 color-primary" style={{ fontSize: '1.2rem' }}>${quotation.totalPrice.toFixed(2)} USD + IVA</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Attachments Section */}
                    {quotation.attachments && quotation.attachments.length > 0 && (
                        <div className="mb-lg">
                            <h4 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Documentos Adjuntos</h4>
                            <div className="flex flex-wrap gap-sm">
                                {quotation.attachments.map((att, idx) => (
                                    <div key={idx} className="flex items-center gap-xs p-xs bg-light rounded border text-xs">
                                        <span>{att.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {quotation.notes && (
                        <div className="mb-lg">
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                Notas
                            </p>
                            <p>{quotation.notes}</p>
                        </div>
                    )}

                    {/* Status Update */}
                    {(!quotation.status || quotation.status === 'pending') && !showStatusUpdate && (
                        <div className="flex gap-md mb-lg">
                            <button className="btn btn-success" onClick={() => { setNewStatus('won'); setShowStatusUpdate(true); }}>
                                <CheckCircle size={20} />
                                Marcar Ganada
                            </button>
                            <button className="btn btn-danger" onClick={() => { setNewStatus('lost'); setShowStatusUpdate(true); }}>
                                <XCircle size={20} />
                                Marcar Perdida
                            </button>
                        </div>
                    )}

                    {showStatusUpdate && (
                        <div className="mb-lg">
                            <div className="form-group">
                                <label className="form-label">Motivo (opcional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ej: Cliente aceptó la propuesta"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-md">
                                <button className="btn btn-primary" onClick={handleUpdateStatus}>
                                    Confirmar
                                </button>
                                <button className="btn btn-outline" onClick={() => setShowStatusUpdate(false)}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Status Display */}
                    {quotation.status && quotation.status !== 'pending' && (
                        <div className="mb-lg">
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                Estado
                            </p>
                            <p>
                                {quotation.status === 'won' && <span className="badge badge-success">Ganada</span>}
                                {quotation.status === 'lost' && <span className="badge badge-danger">Perdida</span>}
                            </p>
                            {quotation.reason && (
                                <p style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.875rem' }}>Motivo: {quotation.reason}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-success"
                        onClick={handleExportPDF}
                        disabled={isExporting}
                    >
                        <FileDown size={20} />
                        {isExporting ? 'Generando...' : 'PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
}
