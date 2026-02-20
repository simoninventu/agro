import { useState, useEffect, Fragment } from 'react';
import { Edit2, Trash2, TrendingUp, Eye, Search, Plus } from 'lucide-react';
import type { Quotation, CatalogProduct } from '../types';
import { getCatalogProducts, deleteCatalogProduct } from '../services/catalogStorage';
import { getConfiguration } from '../services/configStorage';
import { getQuotations } from '../services/storage';
import { format } from 'date-fns';
import { formatThickness } from '../utils/conversions';

interface CatalogListProps {
    onEdit?: (product: CatalogProduct) => void;
    onViewSales?: (product: CatalogProduct) => void;
    onAddNew?: () => void;
    refreshTrigger?: number;
}

export function CatalogList({ onEdit, onViewSales, onAddNew, refreshTrigger }: CatalogListProps) {
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
    const [servicesMap, setServicesMap] = useState<Record<string, string>>({});
    const [sortConfig, setSortConfig] = useState<{ key: keyof CatalogProduct; direction: 'asc' | 'desc' } | null>(null);
    const [allQuotations, setAllQuotations] = useState<Quotation[]>([]);

    useEffect(() => {
        const loadConfig = async () => {
            const config = await getConfiguration();
            const map: Record<string, string> = {};
            config.services.forEach(s => {
                map[s.id] = s.name;
            });
            setServicesMap(map);
        };
        loadConfig();
    }, []);

    useEffect(() => {
        loadProducts();
    }, [refreshTrigger]);

    const loadProducts = async () => {
        const [allProducts, quotes] = await Promise.all([
            getCatalogProducts(),
            getQuotations()
        ]);
        setProducts(allProducts);
        setAllQuotations(quotes);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este producto?')) {
            await deleteCatalogProduct(id);
            loadProducts();
        }
    };

    const handleSort = (key: keyof CatalogProduct) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name: keyof CatalogProduct) => {
        if (!sortConfig || sortConfig.key !== name) {
            return <span style={{ opacity: 0.3, marginLeft: '5px' }}>↕</span>;
        }
        return <span style={{ marginLeft: '5px' }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    const filteredProducts = products.filter(product =>
        (product.codigoCompetencia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.maquina.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.material.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        const aValue = a[key];
        const bValue = b[key];

        if (aValue === undefined || bValue === undefined) return 0;

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const toggleExpand = (id: string) => {
        setExpandedProduct(expandedProduct === id ? null : id);
    };

    const renderFilePreview = (fileData?: string, label?: string) => {
        if (!fileData) return <span className="text-secondary">Sin archivo</span>;

        const isPDF = fileData.startsWith('data:application/pdf') ||
            (fileData.startsWith('http') && fileData.toLowerCase().endsWith('.pdf'));

        return (
            <a
                href={fileData}
                target="_blank"
                rel="noopener noreferrer"
                className="file-link"
            >
                {isPDF ? '📄' : '🖼️'} {label}
            </a>
        );
    };

    return (
        <div className="card">

            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="card-title">Catálogo de Productos ({filteredProducts.length})</h2>
                <button className="btn btn-primary" onClick={onAddNew}>
                    <Plus size={18} />
                    Nuevo
                </button>
            </div>

            <div className="card-body">
                {products.length > 0 && (
                    <div className="search-bar" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por código, marca, máquina o material..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}


                {/* Empty State when no products */}
                {products.length === 0 && (
                    <div className="empty-state">
                        <p>No hay productos en el catálogo</p>
                        <p className="text-secondary">Haz clic en el botón "+ Nuevo" para agregar tu primer producto</p>
                    </div>
                )}

                {/* Product Table when products exist */}
                {products.length > 0 && (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('codigoCompetencia')} style={{ cursor: 'pointer' }}>
                                        Código / Ref {getSortIcon('codigoCompetencia')}
                                    </th>
                                    <th onClick={() => handleSort('marca')} style={{ cursor: 'pointer' }}>
                                        Marca {getSortIcon('marca')}
                                    </th>
                                    <th onClick={() => handleSort('maquina')} style={{ cursor: 'pointer' }}>
                                        Tipo/Máquina {getSortIcon('maquina')}
                                    </th>
                                    <th onClick={() => handleSort('material')} style={{ cursor: 'pointer' }}>
                                        Material {getSortIcon('material')}
                                    </th>
                                    <th onClick={() => handleSort('espesor')} style={{ cursor: 'pointer' }}>
                                        Espesor {getSortIcon('espesor')}
                                    </th>
                                    <th onClick={() => handleSort('peso')} style={{ cursor: 'pointer' }}>
                                        Peso {getSortIcon('peso')}
                                    </th>
                                    <th onClick={() => handleSort('precioUnitario')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                        Costo {getSortIcon('precioUnitario')}
                                    </th>
                                    <th style={{ textAlign: 'right' }}>Última Cotización</th>

                                    <th style={{ textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedProducts.map((product) => {
                                    const isExpanded = expandedProduct === product.id;
                                    const lastQuotation = (() => {
                                        const productQuotations = allQuotations
                                            .filter(q => q.catalogProductId === product.id)
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                        if (productQuotations.length > 0) {
                                            const lastQ = productQuotations[0];
                                            const unitPrice = lastQ.finalPrice / lastQ.quantity;
                                            return `USD ${unitPrice.toFixed(2)}`;
                                        }
                                        return '-';
                                    })();


                                    return (
                                        <Fragment key={product.id}>
                                            <tr className={isExpanded ? 'expanded-row' : ''} onClick={() => toggleExpand(product.id)} style={{ cursor: 'pointer' }}>
                                                <td style={{ fontWeight: 500 }}>{product.codigoCompetencia}</td>
                                                <td>{product.marca}</td>
                                                <td>{product.maquina}</td>
                                                <td>{product.material}</td>
                                                <td>{formatThickness(product.espesor)}</td>
                                                <td>{product.peso} kg</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                                    USD ${product.precioUnitario.toFixed(2)}
                                                </td>
                                                <td style={{ textAlign: 'right', color: lastQuotation !== '-' ? '#2563eb' : 'inherit' }}>
                                                    {lastQuotation}
                                                </td>

                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleExpand(product.id); }}
                                                            className="btn btn-outline btn-icon"
                                                            title="Ver detalles"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onEdit?.(product); }}
                                                            className="btn btn-outline btn-icon"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                                                            className="btn btn-danger btn-icon"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="details-row">
                                                    <td colSpan={9}>
                                                        <div className="product-card-details" style={{ padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '0 0 8px 8px' }}>
                                                            <div className="details-grid">
                                                                <div className="detail-item">
                                                                    <label>Dureza (HRc)</label>
                                                                    <span>{product.dureza || 'N/A'}</span>
                                                                </div>
                                                                <div className="detail-item">
                                                                    <label>Tratamiento Térmico</label>
                                                                    <span>{product.tratamientoTermico || 'N/A'}</span>
                                                                </div>
                                                                <div className="detail-item">
                                                                    <label>Lote Mínimo</label>
                                                                    <span>{product.loteMinimo} unidades</span>
                                                                </div>
                                                                <div className="detail-item">
                                                                    <label>Cotizaciones Registradas</label>
                                                                    <span>
                                                                        {allQuotations.filter(q => q.catalogProductId === product.id).length}
                                                                    </span>
                                                                </div>

                                                                <div className="detail-item">
                                                                    <label>Última modificación</label>
                                                                    <span>{format(new Date(product.lastModified), 'dd/MM/yyyy HH:mm')}</span>
                                                                </div>
                                                                <div className="detail-item full-width">
                                                                    <label>Foto del Producto</label>
                                                                    {renderFilePreview(product.photo, 'Ver Foto')}
                                                                </div>
                                                                <div className="detail-item full-width">
                                                                    <label>Servicios Requeridos</label>
                                                                    <div className="services-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                        {product.selectedServices && product.selectedServices.length > 0 ? (
                                                                            product.selectedServices.map(s => {
                                                                                const serviceId = typeof s === 'string' ? s : s.serviceId;
                                                                                const value = typeof s === 'string' ? 1 : s.value;
                                                                                return (
                                                                                    <span key={serviceId} className="tag">
                                                                                        {servicesMap[serviceId] || 'Servicio Desconocido'}
                                                                                        {value !== 1 && ` (${value})`}
                                                                                    </span>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <span className="text-secondary">Ninguno</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="detail-item full-width">
                                                                    <label>Plano de Referencia</label>
                                                                    {renderFilePreview(product.planoCompetenciaFile, 'Ver archivo')}
                                                                </div>
                                                                <div className="detail-item full-width">
                                                                    <label>Plano Inventu Agro</label>
                                                                    {renderFilePreview(product.planoInventuAgroFile, 'Ver archivo')}
                                                                </div>
                                                            </div>

                                                            <div className="product-card-actions" style={{ marginTop: '1rem', justifyContent: 'flex-start' }}>
                                                                <button
                                                                    onClick={() => onViewSales?.(product)}
                                                                    className="btn btn-secondary"
                                                                >
                                                                    <TrendingUp size={18} />
                                                                    Ver Historial de Ventas
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

