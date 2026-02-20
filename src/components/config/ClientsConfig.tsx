import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import type { ConfigClient } from '../../types/config';
import { getConfiguration, addClient, updateClient, deleteClient } from '../../services/configStorage';

export function ClientsConfig() {
    const [clients, setClients] = useState<ConfigClient[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ConfigClient>>({
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: '',
    });

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        const config = await getConfiguration();
        setClients(config.clients);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        if (editingId) {
            await updateClient(editingId, formData);
        } else {
            await addClient(formData as Omit<ConfigClient, 'id' | 'createdAt'>);
        }

        resetForm();
        loadClients();
    };

    const handleEdit = (client: ConfigClient) => {
        setFormData(client);
        setEditingId(client.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este cliente?')) {
            await deleteClient(id);
            loadClients();
        }
    };

    const resetForm = () => {
        setFormData({ name: '', contact: '', email: '', phone: '', address: '' });
        setIsEditing(false);
        setEditingId(null);
    };

    return (
        <div className="config-section">
            <div className="config-section-header">
                <h3>Clientes</h3>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                        <Plus size={18} />
                        Nuevo Cliente
                    </button>
                )}
            </div>

            {isEditing && (
                <form className="config-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>Nombre *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label>Contacto</label>
                            <input
                                type="text"
                                value={formData.contact}
                                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </div>
                        <div className="form-field">
                            <label>Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="form-field">
                            <label>Teléfono</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="form-field full-width">
                            <label>Dirección</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                            <th>Nombre</th>
                            <th>Contacto</th>
                            <th>Email</th>
                            <th>Teléfono</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                    No hay clientes configurados
                                </td>
                            </tr>
                        ) : (
                            clients.map((client) => (
                                <tr key={client.id}>
                                    <td>{client.name}</td>
                                    <td>{client.contact || '-'}</td>
                                    <td>{client.email || '-'}</td>
                                    <td>{client.phone || '-'}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn-icon" onClick={() => handleEdit(client)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => handleDelete(client.id)}>
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
