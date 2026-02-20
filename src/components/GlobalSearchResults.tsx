import { useState, useEffect } from 'react';
import { Search, Package, FileText, ArrowRight } from 'lucide-react';
import { getQuotations } from '../services/storage';
import { getCatalogProducts } from '../services/catalogStorage';
import type { CatalogProduct, Quotation } from '../types';

interface GlobalSearchResultsProps {
    term: string;
    onEditProduct: (product: CatalogProduct) => void;
    onEditQuotation: (quotation: Quotation) => void;
}

export function GlobalSearchResults({ term, onEditProduct, onEditQuotation }: GlobalSearchResultsProps) {
    const [results, setResults] = useState<{
        products: CatalogProduct[];
        quotations: Quotation[];
    }>({ products: [], quotations: [] });

    useEffect(() => {
        const loadResults = async () => {
            if (!term.trim()) {
                setResults({ products: [], quotations: [] });
                return;
            }

            const lowerTerm = term.toLowerCase();

            // Search in Catalog
            const allProducts = await getCatalogProducts();
            const products = allProducts.filter(p =>
                (p.codigoCompetencia || '').toLowerCase().includes(lowerTerm) ||
                (p.marca || '').toLowerCase().includes(lowerTerm) ||
                (p.maquina || '').toLowerCase().includes(lowerTerm)
            );

            // Search in Quotations
            const allQuotations = await getQuotations();
            const quotations = allQuotations.filter(q =>
                (q.clientName || '').toLowerCase().includes(lowerTerm) ||
                (q.notes || '').toLowerCase().includes(lowerTerm) ||
                q.items.some(item =>
                    item.type === 'catalog' &&
                    (item.description || '').toLowerCase().includes(lowerTerm)
                )
            );

            setResults({ products, quotations });
        };

        loadResults();
    }, [term]);

    const hasResults = results.products.length > 0 || results.quotations.length > 0;

    return (
        <div className="search-results-page">
            <div className="search-results-header">
                <Search size={24} />
                <h1>Resultados para: "{term}"</h1>
            </div>

            {!hasResults ? (
                <div className="empty-search">
                    <p>No se encontraron resultados para su búsqueda.</p>
                </div>
            ) : (
                <div className="search-results-grid">
                    {results.products.length > 0 && (
                        <div className="search-category">
                            <div className="category-header">
                                <Package size={20} />
                                <h2>Catálogo ({results.products.length})</h2>
                            </div>
                            <div className="category-list">
                                {results.products.map(p => (
                                    <div key={p.id} className="search-item" onClick={() => onEditProduct(p)}>
                                        <div className="item-info">
                                            <span className="item-title">{p.codigoCompetencia || 'Sin código'}</span>
                                            <span className="item-subtitle">{p.marca} - {p.maquina}</span>
                                        </div>
                                        <ArrowRight size={18} className="arrow" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.quotations.length > 0 && (
                        <div className="search-category">
                            <div className="category-header">
                                <FileText size={20} />
                                <h2>Cotizaciones ({results.quotations.length})</h2>
                            </div>
                            <div className="category-list">
                                {results.quotations.map(q => (
                                    <div key={q.id} className="search-item" onClick={() => onEditQuotation(q)}>
                                        <div className="item-info">
                                            <span className="item-title">{q.clientName}</span>
                                            <span className="item-subtitle">
                                                {new Date(q.date).toLocaleDateString()} - ${q.totalPrice.toFixed(2)}
                                            </span>
                                        </div>
                                        <ArrowRight size={18} className="arrow" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
