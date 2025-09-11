import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../../components/Card';
import { Send, Paperclip, Save } from 'lucide-react';
import { api } from '../../services/api';
import { Client } from '../../types';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../hooks/useAuth';


const ClientNewRequest: React.FC = () => {
  const { t } = useLocalization();
  const { impersonatedClient } = useAuth();
  
  const [companyId, setCompanyId] = useState('');
  const [tenderUrl, setTenderUrl] = useState('');
  const [description, setDescription] = useState('');
  
  useEffect(() => {
    if (impersonatedClient && impersonatedClient.companies.length > 0) {
        setCompanyId(impersonatedClient.companies[0].id);
    }
  }, [impersonatedClient]);

  if (!impersonatedClient) return <div>{t('select_client_to_impersonate')}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('submit_new_request')}</h1>
      <Card>
        <form>
          <div className="space-y-6">
            
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-1">{t('choose_company')}</label>
              <select
                id="company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {impersonatedClient.companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            
            <div>
                <label htmlFor="tender_link" className="block text-sm font-medium text-gray-300 mb-1">
                    {t('tender_link')} <span className="text-gray-500">({t('optional')})</span>
                </label>
                <input
                    type="url"
                    id="tender_link"
                    value={tenderUrl}
                    onChange={(e) => setTenderUrl(e.target.value)}
                    placeholder="https://zakupki.gov.ru/..."
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">{t('description')}</label>
              <textarea
                id="description"
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t('request_description_placeholder')}
                required
              />
            </div>

            <div>
                <label htmlFor="file-upload" className="flex items-center px-4 py-2 border-2 border-dashed border-gray-600 rounded-md cursor-pointer hover:border-indigo-500">
                    <Paperclip className="h-5 w-5 mr-2 text-gray-400"/>
                    <span className="text-sm text-gray-400">{t('attach_files')}</span>
                </label>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple/>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    type="button"
                    className="w-full flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-700"
                >
                    <Save className="h-5 w-5 mr-2"/>
                    {t('save_draft')}
                </button>
                <button
                    type="submit"
                    className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700"
                >
                    <Send className="h-5 w-5 mr-2"/>
                    {t('submit_request')}
                </button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ClientNewRequest;