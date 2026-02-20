import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import type { ConfigThickness } from '../../types/config';
import { getConfiguration, addThickness, updateThickness, deleteThickness } from '../../services/configStorage';
import { formatThickness } from '../../utils/conversions';

export function ThicknessesConfig() {
    const [thicknesses, setThicknesses] = useState<ConfigThickness[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [value, setValue] = useState('');

    useEffect(() => {
        loadThicknesses();
    }, []);

    const loadThicknesses = async () => {
        const config = await getConfiguration();
        setThicknesses(config.thicknesses.sort((a, b) => a.value - b.value));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) return;

        if (editingId) {
            await updateThickness(editingId, numValue);
        } else {
            await addThickness(numValue);
        }

        resetForm();
        loadThicknesses();
    };

    const handleEdit = (thickness: ConfigThickness) => {
        setValue(thickness.value.toString());
        setEditingId(thickness.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este espesor?')) {
            await deleteThickness(id);
            loadThicknesses();
        }
    };

    const resetForm = () => {
        setValue('');
        setIsEditing(false);
        setEditingId(null);
    };

    return (
        <div className="config-section">
            <div className="config-section-header">
                <h3>Espesores</h3>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                        <Plus size={18} />
                        Nuevo Espesor
                    </button>
                )}
            </div>

            {isEditing && (
                <form className="config-form" onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label>Espesor (mm) *</label>
                        <input
                            type="number"
                            step="0.01"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            required
                            placeholder="Ej: 3.5, 6.0, 10.0"
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
                            <th>Espesor (mm)</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {thicknesses.length === 0 ? (
                            <tr>
                                <td colSpan={2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                    No hay espesores configurados
                                </td>
                            </tr>
                        ) : (
                            thicknesses.map((thickness) => (
                                <tr key={thickness.id}>
                                    <td>{formatThickness(thickness.value)}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn-icon" onClick={() => handleEdit(thickness)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => handleDelete(thickness.id)}>
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
