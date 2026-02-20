import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, DollarSign } from 'lucide-react';
import type { ConfigMaterial } from '../../types/config';
import { getConfiguration, addMaterial, updateMaterial, deleteMaterial } from '../../services/configStorage';

export function MaterialsConfig() {
    const [materials, setMaterials] = useState<ConfigMaterial[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        pricePerKg: '',
        density: '',
    });

    useEffect(() => {
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        const config = await getConfiguration();
        setMaterials(config.materials);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.pricePerKg) return;

        const materialData = {
            name: formData.name,
            pricePerKg: parseFloat(formData.pricePerKg),
            density: formData.density ? parseFloat(formData.density) : undefined,
        };

        if (editingId) {
            await updateMaterial(editingId, materialData);
        } else {
            await addMaterial(materialData);
        }

        resetForm();
        loadMaterials();
    };

    const handleEdit = (material: ConfigMaterial) => {
        setFormData({
            name: material.name,
            pricePerKg: material.pricePerKg.toString(),
            density: material.density?.toString() || '',
        });
        setEditingId(material.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este material? Esto podría afectar los productos del catálogo.')) {
            await deleteMaterial(id);
            loadMaterials();
        }
    };

    const resetForm = () => {
        setFormData({ name: '', pricePerKg: '', density: '' });
        setIsEditing(false);
        setEditingId(null);
    };

    return (
        <div className="config-section">
            <div className="config-section-header">
                <h3>Materiales</h3>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                        <Plus size={18} />
                        Nuevo Material
                    </button>
                )}
            </div>

            {isEditing && (
                <form className="config-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>Nombre del Material *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ej: AISI 1045, Boronizado, etc."
                            />
                        </div>
                        <div className="form-field">
                            <label>Precio por kg (USD) *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.pricePerKg}
                                onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                                required
                                placeholder="0.00"
                            />
                        </div>
                        <div className="form-field">
                            <label>Densidad (kg/m³)</label>
                            <input
                                type="number"
                                step="0.001"
                                value={formData.density}
                                onChange={(e) => setFormData({ ...formData, density: e.target.value })}
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
                            <th>Material</th>
                            <th>Precio por kg</th>
                            <th>Densidad</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materials.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                    No hay materiales configurados
                                </td>
                            </tr>
                        ) : (
                            materials.map((material) => (
                                <tr key={material.id}>
                                    <td>{material.name}</td>
                                    <td>
                                        <span className="price-badge">
                                            <DollarSign size={14} />
                                            {material.pricePerKg.toFixed(2)} / kg
                                        </span>
                                    </td>
                                    <td>{material.density ? `${material.density} kg/m³` : '-'}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn-icon" onClick={() => handleEdit(material)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => handleDelete(material.id)}>
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
