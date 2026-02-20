import { useState } from 'react';
import { Sidebar, type SidebarSection } from './components/Sidebar';
import { QuotationForm } from './components/QuotationForm';
import { QuotationList } from './components/QuotationList';
import type { CatalogProduct, Quotation } from './types';
import { CatalogList } from './components/CatalogList';
import { CatalogFormDialog } from './components/CatalogFormDialog';
import { SalesHistoryDialog } from './components/SalesHistoryDialog';
import { ConfigurationTab } from './components/ConfigurationTab';
import { ToastProvider } from './components/Toast';
import { Dashboard } from './components/Dashboard';
import { GlobalSearchResults } from './components/GlobalSearchResults';

function App() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('dashboard');
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | undefined>(undefined);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [viewingSales, setViewingSales] = useState<CatalogProduct | undefined>(undefined);
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddNew = () => {
    setEditingProduct(undefined);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (product: CatalogProduct) => {
    setEditingProduct(product);
    setIsFormDialogOpen(true);
  };

  const handleFormSave = () => {
    setCatalogRefresh(prev => prev + 1);
  };

  return (
    <ToastProvider>
      <div className="app-container">
        {/* Sidebar */}
        <Sidebar
          activeSection={activeSection}
          onSectionChange={(section) => {
            if (section === 'new') setEditingQuotation(null);
            setActiveSection(section);
            setSearchTerm(''); // Clear search when changing sections
          }}
          onSearch={setSearchTerm}
        />

        {/* Main Content */}
        <div className="main-content">
          {/* Content Area */}
          <main className="content-area">
            {searchTerm ? (
              <GlobalSearchResults
                term={searchTerm}
                onEditProduct={handleEdit}
                onEditQuotation={(q: Quotation) => {
                  setEditingQuotation(q);
                  setActiveSection('new');
                  setSearchTerm('');
                }}
              />
            ) : (
              <>
                {activeSection === 'dashboard' && <Dashboard />}

                {activeSection === 'new' && (
                  <QuotationForm
                    editingQuotation={editingQuotation}
                    onSave={() => {
                      setEditingQuotation(null);
                      setActiveSection('history');
                    }}
                  />
                )}

                {activeSection === 'history' && (
                  <QuotationList
                    onAddNew={() => {
                      setEditingQuotation(null);
                      setActiveSection('new');
                    }}
                    onEdit={(quotation) => {
                      setEditingQuotation(quotation);
                      setActiveSection('new');
                    }}
                  />
                )}
                {activeSection === 'catalog' && (
                  <CatalogList
                    refreshTrigger={catalogRefresh}
                    onAddNew={handleAddNew}
                    onEdit={handleEdit}
                    onViewSales={(product) => setViewingSales(product)}
                  />
                )}
                {activeSection === 'config' && <ConfigurationTab />}
              </>
            )}
          </main>
        </div>

        {/* Catalog Form Dialog */}
        <CatalogFormDialog
          isOpen={isFormDialogOpen}
          editingProduct={editingProduct}
          onClose={() => {
            setIsFormDialogOpen(false);
            setEditingProduct(undefined);
          }}
          onSave={handleFormSave}
        />

        {/* Sales History Dialog */}
        {viewingSales && (
          <SalesHistoryDialog
            product={viewingSales}
            onClose={() => setViewingSales(undefined)}
            onUpdate={async () => {
              setCatalogRefresh(prev => prev + 1);
              // Refresh the viewingSales data using the service
              const { getCatalogProducts } = await import('./services/catalogStorage');
              const updatedProducts = await getCatalogProducts();
              const updated = updatedProducts.find((p: CatalogProduct) => p.id === viewingSales.id);
              if (updated) setViewingSales(updated);
            }}
          />
        )}
      </div>
    </ToastProvider>
  );
}

export default App;
