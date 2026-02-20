import { FileText, LayoutGrid, Settings, BarChart3, Search } from 'lucide-react';

export type SidebarSection = 'dashboard' | 'new' | 'history' | 'catalog' | 'config';

interface SidebarProps {
    activeSection: SidebarSection;
    onSectionChange: (section: SidebarSection) => void;
    onSearch: (term: string) => void;
}

export function Sidebar({ activeSection, onSectionChange, onSearch }: SidebarProps) {
    const menuItems = [
        {
            id: 'dashboard' as SidebarSection,
            label: 'Dashboard',
            icon: BarChart3,
        },
        {
            id: 'history' as SidebarSection,
            label: 'Cotizaciones',
            icon: FileText,
        },
        {
            id: 'catalog' as SidebarSection,
            label: 'Catálogo',
            icon: LayoutGrid,
        },
        {
            id: 'config' as SidebarSection,
            label: 'Configuración',
            icon: Settings,
        },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src="/inventu-logo.png" alt="Inventu Agro" className="sidebar-logo" />
            </div>
            <nav className="sidebar-nav">
                <div className="sidebar-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Búsqueda global..."
                        onChange={(e) => onSearch(e.target.value)}
                    />
                </div>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`sidebar-nav-item ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => onSectionChange(item.id)}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
