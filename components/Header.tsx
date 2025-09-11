import React, { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import RoleSwitcher from './RoleSwitcher';
import { Bell, User, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

const Header: React.FC = () => {
  const { userRole, impersonatedClient, isImpersonating } = useAuth();
  const [clientBalance, setClientBalance] = useState<number | null>(null);

  useEffect(() => {
    if (userRole === 'Client' && impersonatedClient) {
      setClientBalance(impersonatedClient.balance);
    } else {
      setClientBalance(null);
    }
  }, [userRole, impersonatedClient]);
  
  // A "real" client who logs in directly should not see the role switcher.
  // Only staff members, or staff members impersonating a client, should see it.
  const canSwitchRoles = userRole !== 'Client' || isImpersonating;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2 }).format(amount);
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end items-center px-6">
      <div className="flex items-center space-x-4">
        {userRole === 'Client' && clientBalance !== null && (
          <div className="flex items-center px-3 py-1.5 bg-green-100 dark:bg-green-900/50 rounded-md">
            <Wallet className="h-5 w-5 text-green-500 dark:text-green-400 mr-2"/>
            <span className="text-sm font-bold text-green-800 dark:text-green-300">
              {formatCurrency(clientBalance)}
            </span>
          </div>
        )}
        {canSwitchRoles && <RoleSwitcher />}
        <LanguageSwitcher />
        <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Bell className="h-5 w-5" />
        </button>
        <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
          <User className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;