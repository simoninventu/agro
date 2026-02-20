import { useState, useEffect } from 'react';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    Users, LayoutGrid, FileText, CheckCircle, Clock,
    TrendingUp
} from 'lucide-react';
import { getQuotationSummaries } from '../services/storage';
import { getCatalogProducts } from '../services/catalogStorage';
import { getConfiguration } from '../services/configStorage';
import { format, subMonths, isSameMonth, parseISO } from 'date-fns';
import { migrateToSupabase } from '../services/migration';
import { isSupabaseConfigured } from '../lib/supabase';
import { RefreshCw } from 'lucide-react';
import { useToast } from './Toast';

export function Dashboard() {
    const [stats, setStats] = useState({
        totalQuotations: 0,
        pendingQuotations: 0,
        wonQuotations: 0,
        lostQuotations: 0,
        totalProducts: 0,
        totalClients: 0,
        conversionRate: 0,
    });

    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [conversionData, setConversionData] = useState<any[]>([]);
    const [oldestPending, setOldestPending] = useState<any[]>([]);
    const [isMigrating, setIsMigrating] = useState(false);
    const [hasLocalData, setHasLocalData] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        // Check for local data and if migration was already done
        const localQuotations = localStorage.getItem('inventu_quotations');
        const localCatalog = localStorage.getItem('inventu-agro-catalog');
        const localConfig = localStorage.getItem('inventu-agro-config');
        const isMigrationDone = localStorage.getItem('inventu_migration_done');

        setHasLocalData(Boolean((localQuotations || localCatalog || localConfig) && !isMigrationDone));
    }, []);

    useEffect(() => {
        const loadData = async () => {
            const [quotationSummaries, products, config] = await Promise.all([
                getQuotationSummaries(),
                getCatalogProducts(),
                getConfiguration()
            ]);

            // 1. Basic Stats
            const total = quotationSummaries.length;
            const pending = quotationSummaries.filter(q => q.status === 'pending' || !q.status).length;
            const won = quotationSummaries.filter(q => q.status === 'won').length;
            const lost = quotationSummaries.filter(q => q.status === 'lost').length;

            setStats({
                totalQuotations: total,
                pendingQuotations: pending,
                wonQuotations: won,
                lostQuotations: lost,
                totalProducts: products.length,
                totalClients: config.clients.length,
                conversionRate: total > 0 ? (won / (won + lost || 1)) * 100 : 0,
            });

            // 2. Monthly Data (Last 6 months)
            const last6Months = Array.from({ length: 6 }).map((_, i) => {
                const date = subMonths(new Date(), 5 - i);
                const monthStr = format(date, 'MMM');

                const monthQuotations = quotationSummaries.filter(q => isSameMonth(parseISO(q.date), date));

                const won = monthQuotations.filter(q => q.status === 'won');
                const lost = monthQuotations.filter(q => q.status === 'lost');

                return {
                    name: monthStr,
                    'Monto Cotizado': monthQuotations.reduce((sum, q) => sum + q.finalPrice, 0),
                    'Monto Ganado': won.reduce((sum, q) => sum + q.finalPrice, 0),
                    'Monto Perdido': lost.reduce((sum, q) => sum + q.finalPrice, 0),
                    'Ganancia': won.reduce((sum, q) => sum + q.profit, 0),
                    'Cant. Cotizada': monthQuotations.length,
                    'Cant. Ganada': won.length,
                    'Cant. Perdida': lost.length
                };
            });
            setMonthlyData(last6Months);

            // 3. Conversion Data for Pie Chart
            setConversionData([
                { name: 'Ganadas', value: won, color: '#10b981' },
                { name: 'Perdidas', value: lost, color: '#ef4444' },
                { name: 'Pendientes', value: pending, color: '#f59e0b' },
            ]);

            // 4. Oldest Pending
            const oldest = quotationSummaries
                .filter(q => q.status === 'pending' || !q.status)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5);
            setOldestPending(oldest);
        };

        loadData();
    }, []);



    const handleMigrate = async () => {
        if (!window.confirm('¿Deseas migrar los datos locales a Supabase? Esto subirá toda tu información guardada anteriormente en este navegador a la nube.')) return;

        setIsMigrating(true);
        try {
            await migrateToSupabase();
            localStorage.setItem('inventu_migration_done', 'true');
            showToast('Sincronización completada exitosamente', 'success');
            setHasLocalData(false);
            // Reload page to see new data
            window.location.reload();
        } catch (error) {
            console.error('Migration failed:', error);
            showToast('Error al migrar datos', 'error');
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="dashboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 className="dashboard-title" style={{ margin: 0 }}>Dashboard</h1>

                {isSupabaseConfigured && hasLocalData && (
                    <button
                        onClick={handleMigrate}
                        disabled={isMigrating}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                    >
                        {isMigrating ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Migrar datos locales a la nube
                    </button>
                )}
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon-wrapper blue">
                        <FileText size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Total Cotizaciones</span>
                        <span className="stat-value">{stats.totalQuotations}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrapper amber">
                        <Clock size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Pendientes</span>
                        <span className="stat-value">{stats.pendingQuotations}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrapper green">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Ganadas</span>
                        <span className="stat-value">{stats.wonQuotations}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrapper purple">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Tasa Conversión</span>
                        <span className="stat-value">{stats.conversionRate.toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-container" style={{ gridColumn: 'span 2' }}>
                    <h3>Evolución Mensual</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip
                                    formatter={(value: any, name: string | undefined) => {
                                        const label = name || '';
                                        if (label.includes('Monto') || label === 'Ganancia') return [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label];
                                        return [value, label];
                                    }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="Monto Cotizado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="left" dataKey="Monto Ganado" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="left" dataKey="Monto Perdido" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="left" dataKey="Ganancia" fill="#8b5cf6" radius={[4, 4, 0, 0]} />

                                <Line yAxisId="right" type="monotone" dataKey="Cant. Cotizada" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 4 }} />
                                <Line yAxisId="right" type="monotone" dataKey="Cant. Ganada" stroke="#047857" strokeWidth={2} dot={{ r: 4 }} />
                                <Line yAxisId="right" type="monotone" dataKey="Cant. Perdida" stroke="#b91c1c" strokeWidth={2} dot={{ r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-container">
                    <h3>Estado de Cotizaciones</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={conversionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {conversionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="dashboard-footer-grid">
                <div className="list-container">
                    <h3>Cotizaciones Pendientes más Antiguas</h3>
                    <div className="dashboard-list">
                        {oldestPending.length === 0 ? (
                            <p className="empty-msg">No hay cotizaciones pendientes</p>
                        ) : (
                            oldestPending.map(q => (
                                <div key={q.id} className="list-item">
                                    <div className="item-main">
                                        <span className="item-name">{q.clientName}</span>
                                        <span className="item-date">{format(parseISO(q.date), 'dd/MM/yyyy')}</span>
                                    </div>
                                    <div className="item-side">
                                        <span className="item-price">${q.finalPrice.toFixed(2)}</span>
                                        <span className="item-tag warning">Pendiente</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="list-container">
                    <h3>Resumen General</h3>
                    <div className="quick-stats">
                        <div className="quick-stat">
                            <LayoutGrid size={20} />
                            <span>Productos en catálogo: <strong>{stats.totalProducts}</strong></span>
                        </div>
                        <div className="quick-stat">
                            <Users size={20} />
                            <span>Clientes registrados: <strong>{stats.totalClients}</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
