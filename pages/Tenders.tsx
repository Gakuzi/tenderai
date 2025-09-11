import React, { useState, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { Tender, TenderStatus } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
import { Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


const statusClasses: Record<TenderStatus, string> = {
  [TenderStatus.OPEN]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [TenderStatus.PROCESSING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [TenderStatus.CLOSED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  [TenderStatus.AWARDED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [TenderStatus.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const Tenders: React.FC = () => {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchTenders().then(data => {
      setTenders(data);
      setLoading(false);
    });
  }, []);

  const handleRowClick = (id: string) => {
    navigate(`/tenders/${id}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('all_tenders')}</h1>
        <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder={t('search')}
                className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
                <Plus className="h-5 w-5 mr-2" />
                {t('create_tender')}
            </button>
        </div>
      </div>
      <Card>
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">{t('tender_title')}</th>
                  <th scope="col" className="px-6 py-3">{t('client_name')}</th>
                  <th scope="col" className="px-6 py-3">{t('nmck')}</th>
                  <th scope="col" className="px-6 py-3">{t('deadline')}</th>
                  <th scope="col" className="px-6 py-3">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map(tender => (
                  <tr 
                    key={tender.id} 
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                    onClick={() => handleRowClick(tender.id)}
                  >
                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      {tender.title}
                    </th>
                     <td className="px-6 py-4">{tender.clientName}</td>
                    <td className="px-6 py-4">
                      {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(tender.nmck)}
                    </td>
                    <td className="px-6 py-4">{new Date(tender.deadline).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[tender.status]}`}>
                        {tender.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Tenders;