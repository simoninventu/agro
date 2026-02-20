import { useState, useEffect } from 'react';
import { Save, FileDown, Plus, Trash2, Paperclip, X, Package, FileText } from 'lucide-react';
import type { Quotation, CatalogProduct, QuotationItem, QuotationAttachment } from '../types';
import type { ConfigClient } from '../types/config';
import { getCatalogProducts } from '../services/catalogStorage';
import { getConfiguration } from '../services/configStorage';
import { saveQuotation, getQuotations } from '../services/storage';
import { exportToPDF } from '../services/export';
import { useToast } from './Toast';
import { v4 as uuidv4 } from 'uuid';
import { generateQuotationNumber } from '../services/quotationNumber';

interface QuotationFormProps {
    onSave?: () => void;
    editingQuotation?: Quotation | null;
}

export function QuotationForm({ onSave, editingQuotation }: QuotationFormProps) {
    const { showToast } = useToast();
    const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
    const [clients, setClients] = useState<ConfigClient[]>([]);
    const [clientName, setClientName] = useState<string>('');
    const [paymentTerms, setPaymentTerms] = useState<string>('Efectivo');
    const [notes, setNotes] = useState<string>('');
    const [items, setItems] = useState<QuotationItem[]>([]);
    const [attachments, setAttachments] = useState<QuotationAttachment[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    // Temp state for adding items
    const [showAddItem, setShowAddItem] = useState<'catalog' | 'custom' | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [itemQuantity, setItemQuantity] = useState<number>(1);
    const [itemMarkup, setItemMarkup] = useState<number>(25);
    const [customDescription, setCustomDescription] = useState<string>('');
    const [customBaseCost, setCustomBaseCost] = useState<number>(0);

    useEffect(() => {
        const loadData = async () => {
            const products = await getCatalogProducts();
            setCatalogProducts(products);

            const config = await getConfiguration();
            setClients(config.clients);

            if (editingQuotation) {
                setClientName(editingQuotation.clientName);
                setPaymentTerms(editingQuotation.paymentTerms || 'Efectivo');
                setNotes(editingQuotation.notes || '');
                setItems(editingQuotation.items || []);
                setAttachments(editingQuotation.attachments || []);
            } else {
                setItems([]);
                setAttachments([]);
            }
        };
        loadData();
    }, [editingQuotation]);

    const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const handleAddCatalogItem = () => {
        const product = catalogProducts.find(p => p.id === selectedProductId);
        if (!product) return;

        const unitPrice = product.precioUnitario * (1 + itemMarkup / 100);
        const newItem: QuotationItem = {
            id: uuidv4(),
            type: 'catalog',
            description: `${product.codigoCompetencia} - ${product.marca} - ${product.maquina}`,
            quantity: itemQuantity,
            baseCost: product.precioUnitario,
            unitPrice: unitPrice,
            totalPrice: unitPrice * itemQuantity,
            catalogProductId: product.id,
            catalogProduct: product,
            markup: itemMarkup
        };

        setItems([...items, newItem]);
        setShowAddItem(null);
        setSelectedProductId('');
        setItemQuantity(1);
        setItemMarkup(25);
    };

    const handleAddCustomItem = () => {
        if (!customDescription || customBaseCost <= 0) return;

        const unitPrice = customBaseCost * (1 + itemMarkup / 100);
        const newItem: QuotationItem = {
            id: uuidv4(),
            type: 'custom',
            description: customDescription,
            quantity: itemQuantity,
            baseCost: customBaseCost,
            unitPrice: unitPrice,
            totalPrice: unitPrice * itemQuantity,
            markup: itemMarkup
        };

        setItems([...items, newItem]);
        setShowAddItem(null);
        setCustomDescription('');
        setCustomBaseCost(0);
        setItemQuantity(1);
        setItemMarkup(25);
    };

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const attachment: QuotationAttachment = {
                    name: file.name,
                    type: file.type,
                    data: reader.result as string
                };
                setAttachments(prev => [...prev, attachment]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!clientName || items.length === 0) {
            showToast('Por favor especifica el cliente y al menos un ítem', 'error');
            return;
        }

        try {
            let quotationNumber = editingQuotation?.quotationNumber;
            if (!editingQuotation) {
                const existingQuotations = await getQuotations();
                const currentDate = new Date();
                quotationNumber = generateQuotationNumber(existingQuotations, currentDate);
            }

            const quotation: Quotation = {
                id: editingQuotation?.id || uuidv4(),
                quotationNumber,
                date: editingQuotation?.date || new Date().toISOString(),
                clientName,
                items,
                totalPrice,
                paymentTerms,
                notes,
                attachments,
                status: editingQuotation?.status || 'pending',
                reason: editingQuotation?.reason,
            };

            await saveQuotation(quotation);
            showToast(editingQuotation ? 'Cotización actualizada exitosamente!' : 'Cotización guardada exitosamente!');
            if (!editingQuotation) resetForm();
            onSave?.();
        } catch (error) {
            console.error('Error saving quotation:', error);
            showToast('Error al guardar la cotización. Por favor intenta nuevamente.', 'error');
        }
    };

    const resetForm = () => {
        setClientName('');
        setItems([]);
        setAttachments([]);
        setNotes('');
        setItemMarkup(25);
    };

    const handleExportPDF = async () => {
        if (items.length === 0) return;

        setIsExporting(true);
        try {
            let quotationNumber = editingQuotation?.quotationNumber;
            if (!quotationNumber) {
                const existingQuotations = await getQuotations();
                const currentDate = new Date();
                quotationNumber = generateQuotationNumber(existingQuotations, currentDate);
            }

            const quotation: Quotation = {
                id: editingQuotation?.id || `Q${Date.now()}`,
                quotationNumber,
                date: editingQuotation?.date || new Date().toISOString(),
                clientName,
                items,
                totalPrice,
                paymentTerms,
                notes,
                attachments,
                status: editingQuotation?.status || 'pending',
            };
            await exportToPDF(quotation);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            showToast('Error al generar el PDF', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const isValid = clientName && items.length > 0;

    return (
        <div className="card">
            <div className="card-header">
                <h2 className="card-title">{editingQuotation ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
            </div>
            <div className="card-body">
                <div className="grid grid-2 gap-md">
                    {/* Client Name */}
                    <div className="form-group">
                        <label className="form-label">Cliente *</label>
                        <select
                            className="form-select"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                        >
                            <option value="">Seleccionar cliente...</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.name}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Terms */}
                    <div className="form-group">
                        <label className="form-label">Condición de Pago *</label>
                        <select
                            className="form-select"
                            value={paymentTerms}
                            onChange={(e) => setPaymentTerms(e.target.value)}
                        >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Cheques propios">Cheques propios</option>
                            <option value="Cheques terceros">Cheques terceros</option>
                        </select>
                    </div>
                </div>

                {/* Items Section */}
                <div className="mb-lg">
                    <div className="flex justify-between items-center mb-md">
                        <h3 className="section-title">Ítems de la Cotización</h3>
                        <div className="flex gap-sm">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setShowAddItem('catalog')}
                            >
                                <Plus size={16} /> Catálogo
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setShowAddItem('custom')}
                            >
                                <Plus size={16} /> A medida
                            </button>
                        </div>
                    </div>

                    {/* Add Item Forms */}
                    {showAddItem === 'catalog' && (
                        <div className="card p-md mb-md border-primary transition-all">
                            <div className="flex justify-between items-center mb-sm">
                                <h4 style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Agregar Producto de Catálogo</h4>
                                <button className="btn-icon" onClick={() => setShowAddItem(null)}><X size={16} /></button>
                            </div>
                            <div className="grid grid-3 gap-sm">
                                <div className="form-group">
                                    <label className="form-label">Producto</label>
                                    <select
                                        className="form-select"
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {catalogProducts.map(p => (
                                            <option key={p.id} value={p.id}>{p.codigoCompetencia} - {p.marca}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Cantidad</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={itemQuantity}
                                        onChange={(e) => setItemQuantity(Number(e.target.value))}
                                        min="1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Markup (%)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={itemMarkup}
                                        onChange={(e) => setItemMarkup(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <button
                                className="btn btn-primary mt-sm w-full"
                                onClick={handleAddCatalogItem}
                                disabled={!selectedProductId}
                            >
                                <Plus size={18} /> Agregar al presupuesto
                            </button>
                        </div>
                    )}

                    {showAddItem === 'custom' && (
                        <div className="card p-md mb-md border-secondary transition-all">
                            <div className="flex justify-between items-center mb-sm">
                                <h4 style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>Agregar Ítem a Medida</h4>
                                <button className="btn-icon" onClick={() => setShowAddItem(null)}><X size={16} /></button>
                            </div>
                            <div className="grid grid-3 gap-sm">
                                <div className="form-group grid-span-2">
                                    <label className="form-label">Descripción</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Ej: Pernos no cementados x 8"
                                        value={customDescription}
                                        onChange={(e) => setCustomDescription(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Cantidad</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={itemQuantity}
                                        onChange={(e) => setItemQuantity(Number(e.target.value))}
                                        min="1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Costo Unitario (USD)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={customBaseCost}
                                        onChange={(e) => setCustomBaseCost(Number(e.target.value))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Markup (%)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={itemMarkup}
                                        onChange={(e) => setItemMarkup(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <button
                                className="btn btn-secondary mt-sm w-full"
                                onClick={handleAddCustomItem}
                                disabled={!customDescription || customBaseCost <= 0}
                            >
                                <Plus size={18} /> Agregar al presupuesto
                            </button>
                        </div>
                    )}

                    {/* Items List */}
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Descripción</th>
                                    <th>Cantiad</th>
                                    <th>P. Unitario</th>
                                    <th>Total</th>
                                    <th style={{ width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-lg color-text-muted">
                                            No hay ítems cargados
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="flex items-center gap-sm">
                                                    {item.type === 'catalog' ? <Package size={16} className="color-primary" /> : <FileText size={16} className="color-secondary" />}
                                                    {item.description}
                                                </div>
                                            </td>
                                            <td>{item.quantity}</td>
                                            <td>${item.unitPrice.toFixed(2)}</td>
                                            <td className="font-600">${item.totalPrice.toFixed(2)}</td>
                                            <td>
                                                <button className="btn-icon color-danger" onClick={() => removeItem(item.id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {items.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="text-right font-600">Total (+ IVA):</td>
                                        <td className="font-700 color-primary" style={{ fontSize: '1.2rem' }}>${totalPrice.toFixed(2)} USD</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                <div className="grid grid-2 gap-md mb-lg">
                    {/* Notes */}
                    <div className="form-group">
                        <label className="form-label">Notas Generales</label>
                        <textarea
                            className="form-input"
                            rows={3}
                            placeholder="Notas adicionales..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Attachments */}
                    <div className="form-group">
                        <label className="form-label flex items-center gap-xs">
                            <Paperclip size={16} /> Adjuntos
                        </label>
                        <div className="card p-sm bg-light">
                            <input
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="btn btn-secondary btn-sm w-full mb-sm cursor-pointer">
                                Seleccionar archivos
                            </label>
                            <div className="flex flex-col gap-xs max-h-32 overflow-y-auto">
                                {attachments.map((file, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs p-xs bg-white rounded border">
                                        <span className="truncate max-w-40">{file.name}</span>
                                        <button onClick={() => removeAttachment(idx)} className="color-danger">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {attachments.length === 0 && <p className="text-xs color-text-muted text-center italic">Sin adjuntos</p>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-md justify-end">
                    <button className="btn btn-success" onClick={handleExportPDF} disabled={!isValid || isExporting}>
                        <FileDown size={20} />
                        {isExporting ? 'Exportando...' : 'Exportar PDF'}
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={!isValid}>
                        <Save size={20} />
                        {editingQuotation ? 'Actualizar Cotización' : 'Guardar Cotización'}
                    </button>
                </div>
            </div>
        </div>
    );
}
