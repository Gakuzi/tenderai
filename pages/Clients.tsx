import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { Client, ClientStatus } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
import { Search, Plus } from 'lucide-react';
import AddClientModal from '../components/AddClientModal';

const statusClasses: Record<ClientStatus, string> = {
  [ClientStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300',
  [ClientStatus.INACTIVE]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  [ClientStatus.LEAD]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300',
};


const Clients: React.FC = () => {
  const { t } = useLocalization();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const fetchClients = useCallback(() => {
    setLoading(true);
    api.fetchClients().then(data => {
      setClients(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleClientAdded = () => {
    setIsModalOpen(false);
    fetchClients();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('all_clients')}</h1>
        <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder={t('search')}
                className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
                <Plus className="h-5 w-5 mr-2" />
                {t('add_client')}
            </button>
        </div>
      </div>
      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <Link to={`/clients/${client.id}`} key={client.id} className="block hover:shadow-lg transition-shadow duration-300 rounded-lg">
              <Card className="h-full border-2 border-transparent hover:border-indigo-500 transition-colors duration-300 relative">
                <div className="absolute top-4 right-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[client.status]}`}>
                      {t(`status_${client.status}`)}
                  </span>
                </div>
                <div className="flex flex-col items-center text-center pt-4">
                  <img src={client.logoUrl} alt={`${client.name} logo`} className="w-24 h-24 rounded-full mb-4 object-cover"/>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{client.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{client.contactPerson}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{client.email}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {isModalOpen && <AddClientModal onClose={() => setIsModalOpen(false)} onSuccess={handleClientAdded} />}
    </div>
  );
};

export default Clients;