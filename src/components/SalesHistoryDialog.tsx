import React, { useState } from 'react';
import { X, Plus, Trash2, DollarSign, TrendingUp } from 'lucide-react';
import type { CatalogProduct, SaleRecord } from '../types';
import { addSaleRecord, deleteSaleRecord } from '../services/catalogStorage';
import { format } from 'date-fns';

interface SalesHistoryDialogProps {
    product: CatalogProduct;
    onClose: () => void;
    onUpdate: () => void;
}

export function SalesHistoryDialog({ product, onClose, onUpdate }: SalesHistoryDialogProps) {
    const [newSale, setNewSale] = useState({
        quantity: 0,
        unitPrice: product.precioUnitario,
        clientName: '',
        notes: '',
    });

    const handleAddSale = async (e: React.FormEvent) => {
        e.preventDefault();

        const sale: SaleRecord = {
            id: `sale-${Date.now()}`,
            date: new Date().toISOString(),
            quantity: newSale.quantity,
            unitPrice: newSale.unitPrice,
            totalPrice: newSale.quantity * newSale.unitPrice,
            clientName: newSale.clientName || '',
            notes: newSale.notes || undefined,
            status: 'won', // Default for historical sales added manually
        };

        await addSaleRecord(product.id, sale);

        // Reset form
        setNewSale({
            quantity: 0,
            unitPrice: product.precioUnitario,
            clientName: '',
            notes: '',
        });

        onUpdate();
    };

    const handleDeleteSale = async (saleId: string) => {
        if (window.confirm('¿Estás seguro de eliminar este registro de venta?')) {
            await deleteSaleRecord(product.id, saleId);
            onUpdate();
        }
    };

    const calculateStats = () => {
        const sales = product.historialVentas;
        if (sales.length === 0) return { totalSales: 0, averagePrice: 0, totalQuantity: 0 };

        const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
        const totalRevenue = sales.reduce((sum, sale) => sum + (sale.quantity * sale.unitPrice), 0);
        const averagePrice = sales.reduce((sum, sale) => sum + sale.unitPrice, 0) / sales.length;

        return {
            totalSales: sales.length,
            averagePrice,
            totalQuantity,
            totalRevenue,
        };
    };

    const stats = calculateStats();

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content sales-history-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <div>
                        <h2>Historial de Ventas</h2>
                        <p className="text-secondary">Ref: {product.codigoCompetencia} - {product.marca}</p>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X size={24} />
                    </button>
                </div>

                <div className="sales-stats">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">Total Ventas</span>
                            <span className="stat-value">{stats.totalSales}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <DollarSign size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">Precio Promedio</span>
                            <span className="stat-value">${stats.averagePrice.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Plus size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">Cantidad Total</span>
                            <span className="stat-value">{stats.totalQuantity}</span>
                        </div>
                    </div>
                    {stats.totalRevenue !== undefined && (
                        <div className="stat-card">
                            <div className="stat-icon">
                                <DollarSign size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">Ingresos Totales</span>
                                <span className="stat-value">${stats.totalRevenue.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleAddSale} className="add-sale-form">
                    <h3>Registrar Nueva Venta</h3>
                    <div className="form-row">
                        <div className="form-field">
                            <label>Cantidad *</label>
                            <input
                                type="number"
                                value={newSale.quantity}
                                onChange={(e) => setNewSale({ ...newSale, quantity: parseInt(e.target.value) })}
                                required
                                min="1"
                            />
                        </div>
                        <div className="form-field">
                            <label>Precio Unitario (USD) *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newSale.unitPrice}
                                onChange={(e) => setNewSale({ ...newSale, unitPrice: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-field">
                            <label>Cliente</label>
                            <input
                                type="text"
                                value={newSale.clientName}
                                onChange={(e) => setNewSale({ ...newSale, clientName: e.target.value })}
                                placeholder="Nombre del cliente (opcional)"
                            />
                        </div>
                    </div>
                    <div className="form-field">
                        <label>Notas</label>
                        <textarea
                            value={newSale.notes}
                            onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })}
                            placeholder="Notas adicionales (opcional)"
                            rows={2}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary">
                        <Plus size={18} />
                        Agregar Venta
                    </button>
                </form>

                <div className="sales-history-list">
                    <h3>Historial ({product.historialVentas.length} registros)</h3>
                    {product.historialVentas.length === 0 ? (
                        <p className="text-secondary">No hay ventas registradas aún</p>
                    ) : (
                        <div className="sales-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Cantidad</th>
                                        <th>Precio Unit.</th>
                                        <th>Total</th>
                                        <th>Cliente</th>
                                        <th>Notas</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...product.historialVentas].reverse().map((sale) => (
                                        <tr key={sale.id}>
                                            <td>{format(new Date(sale.date), 'dd/MM/yyyy')}</td>
                                            <td>{sale.quantity}</td>
                                            <td>${sale.unitPrice.toFixed(2)}</td>
                                            <td><strong>${(sale.quantity * sale.unitPrice).toFixed(2)}</strong></td>
                                            <td>{sale.clientName || '-'}</td>
                                            <td className="notes-cell">{sale.notes || '-'}</td>
                                            <td>
                                                <button
                                                    onClick={() => handleDeleteSale(sale.id)}
                                                    className="btn-icon btn-danger-icon"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
