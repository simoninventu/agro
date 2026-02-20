import { useState } from 'react';
import { Users, Tag, Cpu, Ruler, Package, Wrench } from 'lucide-react';

import { ClientsConfig } from './config/ClientsConfig';
import { BrandsConfig } from './config/BrandsConfig';
import { MachineTypesConfig } from './config/MachineTypesConfig';
import { ThicknessesConfig } from './config/ThicknessesConfig';
import { MaterialsConfig } from './config/MaterialsConfig';
import { ServicesConfig } from './config/ServicesConfig';

type ConfigSubTab = 'clients' | 'brands' | 'machines' | 'thicknesses' | 'materials' | 'services';

export function ConfigurationTab() {
    const [activeSubTab, setActiveSubTab] = useState<ConfigSubTab>('clients');

    return (
        <div className="card">

            <div className="card-header">
                <h2 className="card-title">Configuración</h2>
            </div>

            <div className="card-body">


                <div className="config-tabs" style={{ boxShadow: 'none', border: '1px solid var(--color-border-light)', marginBottom: 'var(--spacing-lg)' }}>

                    <button
                        className={`config-tab ${activeSubTab === 'clients' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('clients')}
                    >
                        <Users size={18} />
                        Clientes
                    </button>
                    <button
                        className={`config-tab ${activeSubTab === 'brands' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('brands')}
                    >
                        <Tag size={18} />
                        Marcas
                    </button>
                    <button
                        className={`config-tab ${activeSubTab === 'machines' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('machines')}
                    >
                        <Cpu size={18} />
                        Tipos de Producto
                    </button>
                    <button
                        className={`config-tab ${activeSubTab === 'thicknesses' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('thicknesses')}
                    >
                        <Ruler size={18} />
                        Espesores
                    </button>
                    <button
                        className={`config-tab ${activeSubTab === 'materials' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('materials')}
                    >
                        <Package size={18} />
                        Materiales
                    </button>
                    <button
                        className={`config-tab ${activeSubTab === 'services' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('services')}
                    >
                        <Wrench size={18} />
                        Servicios
                    </button>
                </div>

                <div className="config-content" style={{ boxShadow: 'none', padding: 0 }}>

                    {activeSubTab === 'clients' && <ClientsConfig />}
                    {activeSubTab === 'brands' && <BrandsConfig />}
                    {activeSubTab === 'machines' && <MachineTypesConfig />}
                    {activeSubTab === 'thicknesses' && <ThicknessesConfig />}
                    {activeSubTab === 'materials' && <MaterialsConfig />}
                    {activeSubTab === 'services' && <ServicesConfig />}
                </div>
            </div>
        </div>
    );
}
