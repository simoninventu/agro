import { X } from 'lucide-react';
import { CatalogForm } from './CatalogForm';
import type { CatalogProduct } from '../types';

interface CatalogFormDialogProps {
    isOpen: boolean;
    editingProduct?: CatalogProduct;
    onClose: () => void;
    onSave: () => void;
}

export function CatalogFormDialog({ isOpen, editingProduct, onClose, onSave }: CatalogFormDialogProps) {
    if (!isOpen) return null;

    const handleSave = () => {
        onSave();
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={24} />
                </button>
                <CatalogForm
                    editingProduct={editingProduct}
                    onSave={handleSave}
                    onCancel={onClose}
                />
            </div>
        </div>
    );
}
