import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../../components/Card';
import { Building, Plus } from 'lucide-react';
import { Company } from '../../types';
import CompanyWizardModal from '../../components/client/CompanyWizardModal';
import { api } from '../../services/api';

const ClientMyCompanies: React.FC = () => {
  const { impersonatedClient: client, setImpersonatedClient } = useAuth();
  const { t } = useLocalization();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const handleOpenWizardForEdit = (company: Company) => {
    setSelectedCompany(company);
    setIsWizardOpen(true);
  };

  const handleOpenWizardForAdd = () => {
    setSelectedCompany(null);
    setIsWizardOpen(true);
  };

  const handleWizardClose = () => {
    setIsWizardOpen(false);
    setSelectedCompany(null);
  }

  const handleSuccess = useCallback(() => {
    if (client) {
      // In a real app, you might just refetch the client data.
      // Here, we simulate it by refetching the whole client list.
      api.fetchClientById(client.id).then(updatedClient => {
        if (updatedClient) {
          setImpersonatedClient(updatedClient);
        }
      });
    }
    handleWizardClose();
  }, [client, setImpersonatedClient]);
  

  if (!client) {
    return <div>{t('client_not_found')}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('my_companies')}</h1>
        <button
          onClick={handleOpenWizardForAdd}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('add_company')}
        </button>
      </div>
      <Card>
        {client.companies.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('no_companies_added')}</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {client.companies.map(company => (
              <li 
                key={company.id} 
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleOpenWizardForEdit(company)}
              >
                <div className="flex items-center">
                  <div className={`p-3 rounded-full mr-4 ${company.isActive ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-gray-200 dark:bg-gray-600'}`}>
                    <Building className={`h-6 w-6 ${company.isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <p className={`font-semibold text-gray-800 dark:text-white ${!company.isActive && 'line-through'}`}>{company.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">ИНН: {company.inn}, КПП: {company.kpp}</p>
                  </div>
                  {!company.isActive && (
                      <span className="ml-auto px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                          {t('status_INACTIVE')}
                      </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      
      {isWizardOpen && (
        <CompanyWizardModal
          company={selectedCompany}
          onClose={handleWizardClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default ClientMyCompanies;