import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, DollarSign } from 'lucide-react';
import type { ConfigService } from '../../types/config';
import { getConfiguration, addService, updateService, deleteService } from '../../services/configStorage';

export function ServicesConfig() {
    const [services, setServices] = useState<ConfigService[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        unit: 'pza' as 'pza' | 'kg' | 'm2' | 'fijo' | 'm' | 'agujeros' | 'cantidad',
        provider: 'inventu_lab' as 'inventu_lab' | 'externo',
        description: '',
    });

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        const config = await getConfiguration();
        setServices(config.services);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.price) return;

        const serviceData = {
            name: formData.name,
            price: parseFloat(formData.price),
            unit: formData.unit,
            provider: formData.provider,
            description: formData.description || undefined,
        };

        if (editingId) {
            await updateService(editingId, serviceData);
        } else {
            await addService(serviceData);
        }

        resetForm();
        loadServices();
    };

    const handleEdit = (service: ConfigService) => {
        setFormData({
            name: service.name,
            price: service.price.toString(),
            unit: service.unit,
            provider: service.provider,
            description: service.description || '',
        });
        setEditingId(service.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este servicio?')) {
            await deleteService(id);
            loadServices();
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            price: '',
            unit: 'pza',
            provider: 'inventu_lab',
            description: '',
        });
        setIsEditing(false);
        setEditingId(null);
    };

    const getUnitLabel = (unit: string) => {
        switch (unit) {
            case 'pza':
                return '/ pieza';
            case 'kg':
                return '/ kg';
            case 'm2':
                return '/ m²';
            case 'm':
                return '/ m';
            case 'fijo':
                return 'fijo';
            case 'cantidad':
                return '/ cant';
            default:
                return '';
        }
    };

    const getProviderLabel = (provider: string) => {
        switch (provider) {
            case 'inventu_lab':
                return 'Inventu Lab';
            case 'externo':
                return 'Proveedor externo';
            default:
                return provider;
        }
    };

    return (
        <div className="config-section">
            <div className="config-section-header">
                <h3>Servicios</h3>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                        <Plus size={18} />
                        Nuevo Servicio
                    </button>
                )}
            </div>

            {isEditing && (
                <form className="config-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>Nombre del Servicio *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ej: Temple, Rectificado, etc."
                            />
                        </div>
                        <div className="form-field">
                            <label>Precio (USD) *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                required
                                placeholder="0.00"
                            />
                        </div>
                        <div className="form-field">
                            <label>Unidad *</label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                            >
                                <option value="pza">Por pieza</option>
                                <option value="kg">Por kg</option>
                                <option value="m2">Por m²</option>
                                <option value="m">Por m lineal</option>
                                <option value="fijo">Precio fijo</option>
                                <option value="cantidad">Por cantidad</option>
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Proveedor *</label>
                            <select
                                value={formData.provider}
                                onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                            >
                                <option value="inventu_lab">Inventu Lab</option>
                                <option value="externo">Proveedor externo</option>
                            </select>
                        </div>
                        <div className="form-field full-width">
                            <label>Descripción</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Opcional"
                            />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            <Save size={18} />
                            {editingId ? 'Actualizar' : 'Guardar'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={resetForm}>
                            <X size={18} />
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            <div className="config-table">
                <table>
                    <thead>
                        <tr>
                            <th>Servicio</th>
                            <th>Proveedor</th>
                            <th>Precio</th>
                            <th>Unidad</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                    No hay servicios configurados
                                </td>
                            </tr>
                        ) : (
                            services.map((service) => (
                                <tr key={service.id}>
                                    <td>
                                        <div>
                                            <strong>{service.name}</strong>
                                            {service.description && (
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                                    {service.description}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge">{getProviderLabel(service.provider)}</span>
                                    </td>
                                    <td>
                                        <span className="price-badge">
                                            <DollarSign size={14} />
                                            {service.price.toFixed(2)}
                                        </span>
                                    </td>
                                    <td>{getUnitLabel(service.unit)}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn-icon" onClick={() => handleEdit(service)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => handleDelete(service.id)}>
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
    );
}
