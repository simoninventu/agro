import React, { useState, useEffect } from 'react';
import { Eye, Trash2, Plus, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import type { QuotationSummary, Quotation } from '../types';
import { getQuotationSummaries, getQuotationById, deleteQuotation } from '../services/storage';
import { STATUS_LABELS } from '../config/constants';
import { QuotationDetail } from './QuotationDetail';
import { useToast } from './Toast';

interface QuotationListProps {
    onAddNew?: () => void;
    onEdit?: (quotation: Quotation) => void;
}

export function QuotationList({ onAddNew, onEdit }: QuotationListProps) {
    const { showToast } = useToast();
    const [quotations, setQuotations] = useState<QuotationSummary[]>([]);
    const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof QuotationSummary; direction: 'asc' | 'desc' } | null>(null);
    const [filters, setFilters] = useState({
        quotationNumber: '',
        id: '',
        clientName: '',
        productName: '',
        status: 'all'
    });

    const loadQuotations = async () => {
        const summaries = await getQuotationSummaries();
        console.log(`🔄 QuotationList: Loaded ${summaries.length} quotation summaries`);
        setQuotations(summaries);
    };

    useEffect(() => {
        loadQuotations();
    }, []);

    const handleViewDetail = async (id: string) => {
        const quotation = await getQuotationById(id);
        if (quotation) {
            setSelectedQuotation(quotation);
        }
    };

    const handleCloseDetail = () => {
        setSelectedQuotation(null);
        loadQuotations(); // Refresh list in case status was updated
    };

    const handleEditClick = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const quotation = await getQuotationById(id);
        if (quotation && onEdit) {
            onEdit(quotation);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('¿Estás seguro de que deseas eliminar esta cotización? Esta acción no se puede deshacer.')) {
            try {
                await deleteQuotation(id);
                loadQuotations();
            } catch (error) {
                showToast('Error al eliminar la cotización', 'error');
                console.error(error);
            }
        }
    };

    const handleSort = (key: keyof QuotationSummary) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedQuotations = React.useMemo(() => {
        let sortableItems = [...quotations];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === undefined || bValue === undefined) return 0;

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [quotations, sortConfig]);

    const filteredQuotations = sortedQuotations.filter((q) => {
        const matchesStatus = filters.status === 'all' || q.status === filters.status;
        const matchesQuotationNumber = !filters.quotationNumber || (q.quotationNumber && q.quotationNumber.toLowerCase().includes(filters.quotationNumber.toLowerCase()));
        const matchesId = q.id.toLowerCase().includes(filters.id.toLowerCase());
        const matchesClient = q.clientName.toLowerCase().includes(filters.clientName.toLowerCase());
        const matchesProduct = q.productName.toLowerCase().includes(filters.productName.toLowerCase());
        return matchesStatus && matchesQuotationNumber && matchesId && matchesClient && matchesProduct;
    });

    const getSortIcon = (name: keyof QuotationSummary) => {
        if (!sortConfig || sortConfig.key !== name) {
            return <span style={{ opacity: 0.3, marginLeft: '5px' }}>↕</span>;
        }
        return <span style={{ marginLeft: '5px' }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="card-title">Cotizaciones</h2>
                <button className="btn btn-primary" onClick={onAddNew}>
                    <Plus size={18} />
                    Nueva Cotización
                </button>
            </div>
            <div className="card-body">
                {/* Table */}
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>
                                    <div onClick={() => handleSort('quotationNumber')} style={{ cursor: 'pointer' }}>
                                        Nº Cotización {getSortIcon('quotationNumber')}
                                    </div>
                                    <input
                                        type="text"
                                        className="form-input form-input-sm"
                                        placeholder="Filtrar..."
                                        value={filters.quotationNumber}
                                        onChange={(e) => setFilters(prev => ({ ...prev, quotationNumber: e.target.value }))}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ marginTop: '5px', width: '100%', fontSize: '0.8rem', padding: '0.25rem' }}
                                    />
                                </th>
                                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                                    Fecha {getSortIcon('date')}
                                </th>
                                <th>
                                    <div onClick={() => handleSort('clientName')} style={{ cursor: 'pointer' }}>
                                        Cliente {getSortIcon('clientName')}
                                    </div>
                                    <input
                                        type="text"
                                        className="form-input form-input-sm"
                                        placeholder="Filtrar..."
                                        value={filters.clientName}
                                        onChange={(e) => setFilters(prev => ({ ...prev, clientName: e.target.value }))}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ marginTop: '5px', width: '100%', fontSize: '0.8rem', padding: '0.25rem' }}
                                    />
                                </th>
                                <th>
                                    <div onClick={() => handleSort('productName')} style={{ cursor: 'pointer' }}>
                                        Producto {getSortIcon('productName')}
                                    </div>
                                    <input
                                        type="text"
                                        className="form-input form-input-sm"
                                        placeholder="Filtrar..."
                                        value={filters.productName}
                                        onChange={(e) => setFilters(prev => ({ ...prev, productName: e.target.value }))}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ marginTop: '5px', width: '100%', fontSize: '0.8rem', padding: '0.25rem' }}
                                    />
                                </th>
                                <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>
                                    Cant. {getSortIcon('quantity')}
                                </th>
                                <th onClick={() => handleSort('totalCost')} style={{ cursor: 'pointer' }}>
                                    Costo Total {getSortIcon('totalCost')}
                                </th>
                                <th onClick={() => handleSort('finalPrice')} style={{ cursor: 'pointer' }}>
                                    Precio {getSortIcon('finalPrice')}
                                </th>
                                <th onClick={() => handleSort('profit')} style={{ cursor: 'pointer' }}>
                                    Ganancia {getSortIcon('profit')}
                                </th>
                                <th>
                                    <div onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                                        Estado {getSortIcon('status')}
                                    </div>
                                    <select
                                        className="form-select form-select-sm"
                                        value={filters.status}
                                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ marginTop: '5px', width: '100%', fontSize: '0.8rem', padding: '0.25rem' }}
                                    >
                                        <option value="all">Todos</option>
                                        <option value="pending">Pendiente</option>
                                        <option value="won">Ganada</option>
                                        <option value="lost">Perdida</option>
                                    </select>
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQuotations.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center" style={{ padding: '2rem' }}>
                                        No se encontraron cotizaciones.
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotations.map((quotation) => (
                                    <tr key={quotation.id}>
                                        <td>
                                            <strong style={{ color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                                                {quotation.quotationNumber || `#${quotation.id.slice(-6).toUpperCase()}`}
                                            </strong>
                                        </td>
                                        <td>{format(new Date(quotation.date), 'dd/MM/yyyy')}</td>
                                        <td>{quotation.clientName}</td>
                                        <td>{quotation.productName}</td>
                                        <td>{quotation.quantity}</td>
                                        <td>${quotation.totalCost ? quotation.totalCost.toFixed(2) : '0.00'}</td>
                                        <td><strong>${quotation.finalPrice.toFixed(2)}</strong></td>
                                        <td style={{ color: quotation.profit >= 0 ? 'green' : 'red' }}>
                                            ${quotation.profit ? quotation.profit.toFixed(2) : '0.00'}
                                        </td>
                                        <td>
                                            {quotation.status === 'won' && <span className="badge badge-success">{STATUS_LABELS.won}</span>}
                                            {quotation.status === 'lost' && <span className="badge badge-danger">{STATUS_LABELS.lost}</span>}
                                            {(!quotation.status || quotation.status === 'pending') && (
                                                <span className="badge badge-warning">{STATUS_LABELS.pending}</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                <button className="btn btn-outline btn-icon" onClick={() => handleViewDetail(quotation.id)} title="Ver detalles">
                                                    <Eye size={16} />
                                                </button>
                                                {(!quotation.status || quotation.status === 'pending') && (
                                                    <button
                                                        className="btn btn-primary btn-icon"
                                                        onClick={(e) => handleEditClick(quotation.id, e)}
                                                        title="Editar cotización"
                                                        style={{ background: 'var(--color-primary)', color: 'white' }}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-danger btn-icon"
                                                    onClick={(e) => handleDelete(quotation.id, e)}
                                                    title="Eliminar cotización"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedQuotation && <QuotationDetail quotation={selectedQuotation} onClose={handleCloseDetail} />}
        </div>
    );
}
