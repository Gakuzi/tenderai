import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole, Client } from '../types';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import Spinner from './Spinner';
import { X } from 'lucide-react';


const RoleSwitcher: React.FC = () => {
  const { userRole, setUserRole, setImpersonatedClient, setIsImpersonating } = useAuth();
  const { t } = useLocalization();
  const navigate = useNavigate();
  const roles: UserRole[] = ['Admin', 'Manager', 'Analyst', 'Developer', 'Client'];

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientList, setClientList] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = event.target.value as UserRole;
    
    if (newRole === 'Client') {
        setLoadingClients(true);
        setIsClientModalOpen(true);
        api.fetchClients().then(clients => {
            setClientList(clients);
            setLoadingClients(false);
        });
    } else {
        setImpersonatedClient(null);
        setIsImpersonating(false); // No longer impersonating when switching to a staff role
        setUserRole(newRole);
        navigate('/dashboard');
    }
  };

  const handleClientSelect = (client: Client) => {
    setImpersonatedClient(client);
    setUserRole('Client');
    setIsImpersonating(true); // Staff is now impersonating
    setIsClientModalOpen(false);
    navigate('/client/dashboard');
  }

  const ClientSelectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">{t('select_client_to_impersonate')}</h2>
                <button onClick={() => setIsClientModalOpen(false)} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">
                    <X className="h-5 w-5"/>
                </button>
            </div>
            {loadingClients ? <Spinner/> : (
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                    {clientList.map(client => (
                        <li key={client.id}>
                            <button 
                                onClick={() => handleClientSelect(client)}
                                className="w-full text-left flex items-center p-3 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                <img src={client.logoUrl} alt={client.name} className="w-10 h-10 rounded-full mr-3"/>
                                <div>
                                    <p className="font-semibold text-white">{client.name}</p>
                                    <p className="text-sm text-gray-400">{client.email}</p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </div>
  );

  return (
    <div>
      <select
        value={userRole}
        onChange={handleRoleChange}
        className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {roles.map(role => (
          <option key={role} value={role}>{t(role)}</option>
        ))}
      </select>
      {isClientModalOpen && <ClientSelectionModal />}
    </div>
  );
};

export default RoleSwitcher;