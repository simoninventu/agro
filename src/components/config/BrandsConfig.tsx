import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import type { ConfigBrand } from '../../types/config';
import { getConfiguration, addBrand, updateBrand, deleteBrand } from '../../services/configStorage';

export function BrandsConfig() {
    const [brands, setBrands] = useState<ConfigBrand[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');

    useEffect(() => {
        loadBrands();
    }, []);

    const loadBrands = async () => {
        const config = await getConfiguration();
        setBrands(config.brands);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        if (editingId) {
            await updateBrand(editingId, name);
        } else {
            await addBrand(name);
        }

        resetForm();
        loadBrands();
    };

    const handleEdit = (brand: ConfigBrand) => {
        setName(brand.name);
        setEditingId(brand.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta marca?')) {
            await deleteBrand(id);
            loadBrands();
        }
    };

    const resetForm = () => {
        setName('');
        setIsEditing(false);
        setEditingId(null);
    };

    return (
        <div className="config-section">
            <div className="config-section-header">
                <h3>Marcas</h3>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                        <Plus size={18} />
                        Nueva Marca
                    </button>
                )}
            </div>

            {isEditing && (
                <form className="config-form" onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label>Nombre de la Marca *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Ej: John Deere, Case IH, etc."
                        />
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
                            <th>Nombre</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {brands.length === 0 ? (
                            <tr>
                                <td colSpan={2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                    No hay marcas configuradas
                                </td>
                            </tr>
                        ) : (
                            brands.map((brand) => (
                                <tr key={brand.id}>
                                    <td>{brand.name}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn-icon" onClick={() => handleEdit(brand)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => handleDelete(brand.id)}>
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
