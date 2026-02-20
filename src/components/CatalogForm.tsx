import React, { useState, useEffect } from 'react';
import { Save, X, Upload, FileText } from 'lucide-react';
import type { CatalogProduct } from '../types';
import { saveCatalogProduct } from '../services/catalogStorage';
import { getConfiguration } from '../services/configStorage';
import { formatThickness } from '../utils/conversions';
import { uploadFile, isSupabaseConfigured } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CatalogFormProps {
    editingProduct?: CatalogProduct;
    onSave?: () => void;
    onCancel?: () => void;
}

export function CatalogForm({ editingProduct, onSave, onCancel }: CatalogFormProps) {
    const [formData, setFormData] = useState<Partial<CatalogProduct>>({
        codigoCompetencia: '',
        marca: '',
        maquina: '',
        largo: 0, // mm
        ancho: 0, // mm
        espesor: 0,
        peso: 0,
        material: '',
        dureza: '',
        tratamientoTermico: '',

        precioUnitario: 0,
        loteMinimo: 1,
        planoCompetenciaFile: undefined,
        planoInventuAgroFile: undefined,
        photo: undefined,
        selectedServices: [],
        historialVentas: [],
    });

    // State for configuration options
    const [brands, setBrands] = useState<string[]>([]);
    const [machineTypes, setMachineTypes] = useState<string[]>([]);
    const [thicknesses, setThicknesses] = useState<number[]>([]);
    const [materials, setMaterials] = useState<any[]>([]); // Store full material objects with density
    const [services, setServices] = useState<any[]>([]); // Store full service objects
    const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
    const [isManualWeight, setIsManualWeight] = useState(false);
    const [isManualPrice, setIsManualPrice] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [costBreakdown, setCostBreakdown] = useState<{
        materialCost: number;
        materialUnitPrice: number;
        servicesCost: number;
        servicesDetails: {
            name: string;
            cost: number;
            unitPrice: number;
            quantity: number;
            unit: string;
        }[];
        totalCost: number;
    } | null>(null);

    useEffect(() => {
        const loadConfig = async () => {
            // Load configuration options
            const config = await getConfiguration();
            setBrands(config.brands.map(b => b.name));
            setMachineTypes(config.machineTypes.map(mt => mt.name));
            setThicknesses(config.thicknesses.map(t => t.value));
            setMaterials(config.materials); // Store full material objects
            setServices(config.services);
        };
        loadConfig();
    }, []);

    // Calculate cost automatically
    useEffect(() => {
        if (isManualPrice) return;

        const weight = formData.peso || 0;
        const materialName = formData.material;
        const selectedServices = formData.selectedServices || [];

        let materialCost = 0;
        let servicesCost = 0;

        let materialUnitPrice = 0;
        // Calculate material cost
        if (weight > 0 && materialName) {
            const material = materials.find(m => m.name === materialName);
            if (material && material.pricePerKg) {
                materialUnitPrice = material.pricePerKg;
                materialCost = weight * material.pricePerKg;
            }
        }

        const servicesDetails: {
            name: string;
            cost: number;
            unitPrice: number;
            quantity: number;
            unit: string;
        }[] = [];

        // Calculate services cost
        selectedServices.forEach(selected => {
            const service = services.find(s => s.id === selected.serviceId);
            if (service) {
                const quantity = selected.value || 0;
                // Check if price exists and is valid
                if (service.price) {
                    const cost = quantity * service.price;
                    servicesCost += cost;
                    servicesDetails.push({
                        name: service.name,
                        cost: parseFloat(cost.toFixed(2)),
                        unitPrice: service.price,
                        quantity,
                        unit: service.unit
                    });
                }
            }
        });

        const totalCost = materialCost + servicesCost;

        setCostBreakdown({
            materialCost: parseFloat(materialCost.toFixed(2)),
            materialUnitPrice,
            servicesCost: parseFloat(servicesCost.toFixed(2)),
            servicesDetails,
            totalCost: parseFloat(totalCost.toFixed(2))
        });

        setFormData(prev => ({ ...prev, precioUnitario: parseFloat(totalCost.toFixed(2)) }));

    }, [formData.peso, formData.material, formData.selectedServices, materials, services, isManualPrice]);

    useEffect(() => {
        if (editingProduct) {
            // Normalize selectedServices if they are in the old format (array of strings)
            const normalizedServices = (editingProduct.selectedServices || []).map(s => {
                if (typeof s === 'string') {
                    return { serviceId: s, value: 1 };
                }
                return s;
            });

            setFormData({
                ...editingProduct,
                selectedServices: normalizedServices
            });
            setIsEditMode(true);
        } else {
            setIsEditMode(false);
        }
    }, [editingProduct]);

    const handleInputChange = (field: keyof CatalogProduct, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Calculate weight automatically when dimensions, thickness, or material change
    useEffect(() => {
        const largo = formData.largo || 0;
        const ancho = formData.ancho || 0;
        const espesor = formData.espesor || 0;
        const materialName = formData.material;

        if (!isManualWeight && largo > 0 && ancho > 0 && espesor > 0 && materialName) {
            // Find the material with density
            const material = materials.find(m => m.name === materialName);
            if (material && material.density) {
                // Volume in mm³
                const volumeMm3 = largo * ancho * espesor;
                // Convert to cm³ (1 cm³ = 1000 mm³)
                const volumeCm3 = volumeMm3 / 1000;
                // Weight in grams = volume (cm³) × density (g/cm³)
                const densityGcm3 = material.density / 1000;
                const weightGrams = volumeCm3 * densityGcm3;
                // Convert to kg
                const weightKg = parseFloat((weightGrams / 1000).toFixed(1));

                // Area of 6 faces in m2
                const areaM2 = parseFloat((2 * (largo * ancho + largo * espesor + ancho * espesor) / 1000000).toFixed(4));

                setFormData(prev => {
                    // Only auto-update service values if not in edit mode (i.e., creating a new product)
                    // When editing, preserve the saved service values
                    const updatedServices = isEditMode
                        ? prev.selectedServices
                        : (prev.selectedServices || []).map(selected => {
                            const service = services.find(s => s.id === selected.serviceId);
                            if (!service) return selected;

                            if (service.unit === 'kg') return { ...selected, value: weightKg };
                            if (service.unit === 'm2') return { ...selected, value: areaM2 };
                            return selected;
                        });

                    return {
                        ...prev,
                        peso: weightKg,
                        selectedServices: updatedServices
                    };
                });
            }
        }
    }, [formData.largo, formData.ancho, formData.espesor, formData.material, materials, services, isManualWeight, isEditMode]);

    const handleFileUpload = async (field: 'planoCompetenciaFile' | 'planoInventuAgroFile' | 'photo', file: File) => {
        if (!isSupabaseConfigured) {
            // Fallback to Base64 if Supabase is not configured
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                setFormData(prev => ({ ...prev, [field]: base64 }));
            };
            reader.readAsDataURL(file);
            return;
        }

        setUploadingFiles(prev => ({ ...prev, [field]: true }));
        try {
            const bucket = field === 'photo' ? 'product-photos' : 'product-drawings';
            const extension = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
            const path = `catalog/${fileName}`;

            const publicUrl = await uploadFile(bucket, path, file);
            setFormData(prev => ({ ...prev, [field]: publicUrl }));
        } catch (error) {
            console.error(`Error uploading ${field}:`, error);
            // Optionally show user error toast here
        } finally {
            setUploadingFiles(prev => ({ ...prev, [field]: false }));
        }
    };

    const handleServiceToggle = (serviceId: string) => {
        setFormData(prev => {
            const currentServices = prev.selectedServices || [];
            // Check if it exists handling both object and string format (though it should be normalized now)
            const exists = currentServices.some(s =>
                (typeof s === 'string' ? s === serviceId : (s as any).serviceId === serviceId)
            );

            if (exists) {
                return {
                    ...prev,
                    selectedServices: currentServices.filter(s =>
                        (typeof s === 'string' ? s !== serviceId : (s as any).serviceId !== serviceId)
                    )
                };
            } else {
                // Find service to check its unit
                const service = services.find(s => s.id === serviceId);
                let initialValue = 1;

                if (service) {
                    if (service.unit === 'kg') {
                        initialValue = prev.peso || 0;
                    } else if (service.unit === 'm2') {
                        // Calculate area of all 6 faces in m²
                        const largo = prev.largo || 0;
                        const ancho = prev.ancho || 0;
                        const espesor = prev.espesor || 0;
                        const areaM2 = 2 * (largo * ancho + largo * espesor + ancho * espesor) / 1000000;
                        initialValue = parseFloat(areaM2.toFixed(4));
                    }
                }

                return { ...prev, selectedServices: [...currentServices, { serviceId, value: initialValue }] };
            }
        });
    };

    const handleServiceValueChange = (serviceId: string, newValue: number) => {
        setFormData(prev => {
            const currentServices = prev.selectedServices || [];
            return {
                ...prev,
                selectedServices: currentServices.map(s =>
                    s.serviceId === serviceId ? { ...s, value: newValue } : s
                )
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const product: CatalogProduct = {
            id: editingProduct?.id || uuidv4(),
            codigoCompetencia: formData.codigoCompetencia || '',
            marca: formData.marca || '',
            maquina: formData.maquina || '',
            largo: formData.largo || 0,
            ancho: formData.ancho || 0,
            espesor: formData.espesor || 0,
            peso: formData.peso || 0,
            material: formData.material || '',
            dureza: formData.dureza || '',
            tratamientoTermico: formData.tratamientoTermico || '',

            precioUnitario: formData.precioUnitario || 0,
            loteMinimo: formData.loteMinimo || 1,
            planoCompetenciaFile: formData.planoCompetenciaFile,
            planoInventuAgroFile: formData.planoInventuAgroFile,
            photo: formData.photo,
            selectedServices: formData.selectedServices || [],
            historialVentas: formData.historialVentas || [],
            createdDate: editingProduct?.createdDate || new Date().toISOString(),
            lastModified: new Date().toISOString(),
        };

        await saveCatalogProduct(product);
        resetForm();
        onSave?.();
    };

    const resetForm = () => {
        setFormData({
            codigoCompetencia: '',
            marca: '',
            maquina: '',
            largo: 0,
            ancho: 0,
            espesor: 0,
            peso: 0,
            material: '',
            dureza: '',
            tratamientoTermico: '',

            precioUnitario: 0,
            loteMinimo: 1,
            planoCompetenciaFile: undefined,
            planoInventuAgroFile: undefined,
            photo: undefined,
            selectedServices: [],
            historialVentas: [],
        });
        setIsEditMode(false);
    };

    const renderFilePreview = (fileData?: string, label?: string) => {
        if (!fileData) return null;

        const isPDF = fileData.startsWith('data:application/pdf') ||
            (fileData.startsWith('http') && fileData.toLowerCase().endsWith('.pdf'));

        return (
            <div className="file-preview">
                {isPDF ? (
                    <div className="file-preview-pdf">
                        <FileText size={48} />
                        <p>{label} (PDF)</p>
                        {fileData.startsWith('http') && (
                            <a href={fileData} target="_blank" rel="noopener noreferrer" className="btn btn-link">
                                Ver PDF
                            </a>
                        )}
                    </div>
                ) : (
                    <img src={fileData} alt={label} className="file-preview-image" />
                )}
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="catalog-form">
            <div className="form-header">
                <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                {editingProduct && onCancel && (
                    <button type="button" onClick={onCancel} className="btn-icon">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="form-grid">
                {/* Product Information */}
                <div className="form-section">
                    <h3>Información del Producto</h3>
                    <div className="form-row">
                        <div className="form-field">
                            <label>Código / Ref</label>
                            <input
                                type="text"
                                value={formData.codigoCompetencia}
                                onChange={(e) => handleInputChange('codigoCompetencia', e.target.value)}
                            />
                        </div>
                        <div className="form-field">
                            <label>Marca *</label>
                            <select
                                value={formData.marca}
                                onChange={(e) => handleInputChange('marca', e.target.value)}
                                required
                            >
                                <option value="">Seleccionar marca...</option>
                                {brands.map((brand) => (
                                    <option key={brand} value={brand}>
                                        {brand}
                                    </option>
                                ))}
                            </select>
                            {brands.length === 0 && (
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                                    No hay marcas configuradas. Ve a <strong>Configuración → Marcas</strong> para agregar marcas.
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="form-field">
                        <label>Tipo de Producto *</label>
                        <select
                            value={formData.maquina}
                            onChange={(e) => handleInputChange('maquina', e.target.value)}
                            required
                        >
                            <option value="">Seleccionar tipo de producto...</option>
                            {machineTypes.map((machineType) => (
                                <option key={machineType} value={machineType}>
                                    {machineType}
                                </option>
                            ))}
                        </select>
                        {machineTypes.length === 0 && (
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                                No hay tipos de producto configurados. Ve a <strong>Configuración → Tipos de Producto</strong> para agregar tipos.
                            </p>
                        )}
                    </div>
                </div>

                {/* Technical Specifications */}
                <div className="form-section">
                    <h3>Especificaciones Técnicas</h3>
                    <div className="form-row">
                        <div className="form-field">
                            <label>Largo (mm) *</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.largo || ''}
                                onChange={(e) => handleInputChange('largo', parseFloat(e.target.value) || 0)}
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label>Ancho (mm) *</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.ancho || ''}
                                onChange={(e) => handleInputChange('ancho', parseFloat(e.target.value) || 0)}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-field">
                            <label>Espesor (mm) *</label>
                            <select
                                value={formData.espesor}
                                onChange={(e) => handleInputChange('espesor', parseFloat(e.target.value))}
                                required
                            >
                                <option value="">Seleccionar espesor...</option>
                                {thicknesses.map((thickness) => (
                                    <option key={thickness} value={thickness}>
                                        {formatThickness(thickness)}
                                    </option>
                                ))}
                            </select>
                            {thicknesses.length === 0 && (
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                                    No hay espesores configurados. Ve a <strong>Configuración → Espesores</strong> para agregar espesores.
                                </p>
                            )}
                        </div>
                        <div className="form-field">
                            <label>Material *</label>
                            <select
                                value={formData.material}
                                onChange={(e) => handleInputChange('material', e.target.value)}
                                required
                            >
                                <option value="">Seleccionar material...</option>
                                {materials.map((material) => (
                                    <option key={material.id} value={material.name}>
                                        {material.name} {material.density ? `(${material.density} kg/m³)` : ''}
                                    </option>
                                ))}
                            </select>
                            {materials.length === 0 && (
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                                    No hay materiales configurados. Ve a <strong>Configuración → Materiales</strong> para agregar materiales.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label>Dureza (HRc)</label>
                            <input
                                type="text"
                                value={formData.dureza || ''}
                                onChange={(e) => handleInputChange('dureza', e.target.value)}
                                placeholder="Ej: 58-62"
                            />
                        </div>
                        <div className="form-field">
                            <label>Tratamiento Térmico (Especificación)</label>
                            <input
                                type="text"
                                value={formData.tratamientoTermico || ''}
                                onChange={(e) => handleInputChange('tratamientoTermico', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-field">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ marginBottom: 0 }}>Peso (kg)</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={isManualWeight}
                                        onChange={(e) => setIsManualWeight(e.target.checked)}
                                    />
                                    Modo Manual
                                </label>
                            </div>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.peso || 0}
                                onChange={(e) => handleInputChange('peso', parseFloat(e.target.value))}
                                readOnly={!isManualWeight}
                                style={!isManualWeight ? { backgroundColor: 'var(--color-bg-secondary)', cursor: 'not-allowed' } : {}}
                            />
                            {!isManualWeight && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                                    Calculado automáticamente según dimensiones y material
                                </p>
                            )}
                        </div>
                    </div>
                </div>



                {/* Services */}
                <div className="form-section full-width">
                    <h3>Servicios Requeridos</h3>
                    <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {services.map((service) => {
                            // Extract selected services and handle both object and potential string format
                            const currentSelected = formData.selectedServices || [];
                            const isSelected = currentSelected.some(s =>
                                typeof s === 'string' ? s === service.id : (s as any).serviceId === service.id
                            );

                            const selectedService = currentSelected.find(s =>
                                typeof s === 'string' ? s === service.id : (s as any).serviceId === service.id
                            );
                            const selectedValue = (selectedService && typeof selectedService === 'object')
                                ? (selectedService as any).value
                                : 1;

                            // Determine if we should show input based on unit type
                            // 'fijo', 'pza' might not need variable input if it's always per piece of the product itself
                            // But let's allow quantity for 'pza' and 'kg' and 'm' etc.
                            // 'fijo' might be just a toggle
                            const showInput = isSelected && service.unit !== 'fijo';

                            return (
                                <div key={service.id} className={`service-item ${isSelected ? 'selected' : ''}`}
                                    style={{
                                        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                        borderRadius: '4px',
                                        padding: '0.75rem',
                                        backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent',
                                        transition: 'all 0.2s ease'
                                    }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: showInput ? '0.5rem' : 0 }}>
                                        <input
                                            type="checkbox"
                                            id={`service-${service.id}`}
                                            checked={isSelected}
                                            onChange={() => handleServiceToggle(service.id)}
                                            style={{ width: '1.2rem', height: '1.2rem' }}
                                        />
                                        <label htmlFor={`service-${service.id}`} style={{ cursor: 'pointer', fontWeight: 500, flex: 1 }}>
                                            {service.name}
                                        </label>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                            {service.unit === 'm' ? '$/m' : service.unit === 'm2' ? '$/m²' : service.unit === 'agujeros' ? '$/aguj' : service.unit === 'kg' ? '$/kg' : service.unit === 'pza' ? '$/pza' : 'Fijo'}
                                        </span>
                                    </div>

                                    {showInput && (
                                        <div style={{ paddingLeft: '1.8rem' }}>
                                            <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px', color: 'var(--color-text-secondary)' }}>
                                                {service.unit === 'm' ? 'Metros lineales:' :
                                                    service.unit === 'm2' ? 'Metros cuadrados:' :
                                                        service.unit === 'agujeros' ? 'Cantidad de agujeros:' :
                                                            service.unit === 'kg' ? 'Kilogramos:' :
                                                                'Cantidad:'}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step={['agujeros', 'pza'].includes(service.unit) ? "1" : "0.01"}
                                                value={selectedValue}
                                                onChange={(e) => handleServiceValueChange(service.id, parseFloat(e.target.value) || 0)}
                                                className="form-input"
                                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {services.length === 0 && (
                            <p style={{ gridColumn: '1 / -1', color: 'var(--color-text-secondary)' }}>
                                No hay servicios configurados.
                            </p>
                        )}
                    </div>
                </div>

                {/* Documentation */}
                <div className="form-section full-width">
                    <h3>Documentación y Fotos</h3>
                    <div className="form-row">
                        <div className="form-field">
                            <label>Foto del Producto</label>
                            <div className="file-upload-wrapper">
                                <label className={`file-upload-btn ${uploadingFiles['photo'] ? 'loading' : ''}`}>
                                    {uploadingFiles['photo'] ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                    {uploadingFiles['photo'] ? 'Subiendo...' : 'Subir Foto'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileUpload('photo', file);
                                        }}
                                        style={{ display: 'none' }}
                                        disabled={uploadingFiles['photo']}
                                    />
                                </label>
                                {renderFilePreview(formData.photo, 'Foto del Producto')}
                            </div>
                        </div>
                        <div className="form-field">
                            <label>Plano de Referencia</label>
                            <div className="file-upload-wrapper">
                                <label className={`file-upload-btn ${uploadingFiles['planoCompetenciaFile'] ? 'loading' : ''}`}>
                                    {uploadingFiles['planoCompetenciaFile'] ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                    {uploadingFiles['planoCompetenciaFile'] ? 'Subiendo...' : 'Subir archivo'}
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileUpload('planoCompetenciaFile', file);
                                        }}
                                        style={{ display: 'none' }}
                                        disabled={uploadingFiles['planoCompetenciaFile']}
                                    />
                                </label>
                                {renderFilePreview(formData.planoCompetenciaFile, 'Plano de Referencia')}
                            </div>
                        </div>
                        <div className="form-field">
                            <label>Plano Inventu Agro</label>
                            <div className="file-upload-wrapper">
                                <label className={`file-upload-btn ${uploadingFiles['planoInventuAgroFile'] ? 'loading' : ''}`}>
                                    {uploadingFiles['planoInventuAgroFile'] ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                    {uploadingFiles['planoInventuAgroFile'] ? 'Subiendo...' : 'Subir archivo'}
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileUpload('planoInventuAgroFile', file);
                                        }}
                                        style={{ display: 'none' }}
                                        disabled={uploadingFiles['planoInventuAgroFile']}
                                    />
                                </label>
                                {renderFilePreview(formData.planoInventuAgroFile, 'Plano Inventu Agro')}
                            </div>
                        </div>
                    </div>
                </div>


                {/* Commercial Details */}
                <div className="form-section">

                    <div className="form-field">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ marginBottom: 0 }}>Precio Unitario (USD) *</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                <input
                                    type="checkbox"
                                    checked={isManualPrice}
                                    onChange={(e) => setIsManualPrice(e.target.checked)}
                                />
                                Modo Manual
                            </label>
                        </div>
                        {isManualPrice && (
                            <input
                                type="number"
                                step="0.01"
                                value={formData.precioUnitario}
                                onChange={(e) => handleInputChange('precioUnitario', parseFloat(e.target.value))}
                                required
                            />
                        )}
                        {!isManualPrice && costBreakdown && (
                            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>Material ({formData.peso} kg) @ ${costBreakdown.materialUnitPrice.toFixed(2)}/kg:</span>
                                    <strong>${costBreakdown.materialCost.toFixed(2)}</strong>
                                </div>

                                {costBreakdown.servicesDetails.length > 0 && (
                                    <div style={{ marginBottom: '4px' }}>
                                        <div style={{ fontWeight: 500, marginBottom: '2px' }}>Servicios:</div>
                                        {costBreakdown.servicesDetails.map((service, idx) => {
                                            const unitLabel = service.unit === 'm' ? 'm' :
                                                service.unit === 'm2' ? 'm²' :
                                                    service.unit === 'agujeros' ? 'aguj' :
                                                        service.unit === 'kg' ? 'kg' :
                                                            service.unit === 'pza' ? 'pza' : '';

                                            return (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', color: 'var(--color-text-secondary)' }}>
                                                    <span>- {service.name} ({service.quantity} {unitLabel}) {service.unit !== 'fijo' ? `@ $${service.unitPrice.toFixed(2)}/${unitLabel}:` : ':'}</span>
                                                    <span>${service.cost.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '0.25rem', paddingTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    <span>Total Calculado:</span>
                                    <span>${costBreakdown.totalCost.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-field">
                        <label>Lote Mínimo *</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.loteMinimo}
                            onChange={(e) => handleInputChange('loteMinimo', parseInt(e.target.value) || 1)}
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                    <Save size={18} />
                    {editingProduct ? 'Actualizar' : 'Guardar'} Producto
                </button>
                <button type="button" onClick={resetForm} className="btn btn-secondary">
                    <X size={18} />
                    Limpiar
                </button>
            </div>
        </form >
    );
}
