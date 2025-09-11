import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { api } from '../../services/api';
import { Client, FinancialTransactionType } from '../../types';
import Spinner from '../../components/Spinner';
import Card from '../../components/Card';
import { Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const ClientFinances: React.FC = () => {
  const { t } = useLocalization();
  const { impersonatedClient: client } = useAuth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount);
  };
  
  const getTransactionAmountClass = (type: FinancialTransactionType) => {
    return type === 'DEBIT' ? 'text-red-500' : 'text-green-500';
  };
  
  const getTransactionSign = (type: FinancialTransactionType) => {
      return type === 'DEBIT' ? '-' : '+';
  }

  if (!client) return <div>{t('select_client_to_impersonate')}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('client_finances')}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-400 mb-2">{t('current_balance')}</h2>
            <p className="text-4xl font-bold text-white">{formatCurrency(client.balance)}</p>
          </Card>
          <Card>
             <h2 className="text-lg font-semibold text-gray-200 mb-3">{t('download_documents')}</h2>
             <div className="space-y-3">
                <button className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
                    <Download className="h-4 w-4 mr-2"/> {t('completion_certificate')}
                </button>
                 <button className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium">
                    <Download className="h-4 w-4 mr-2"/> {t('reconciliation_statement')}
                </button>
             </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-semibold mb-4">{t('transactions_history')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3">{t('date')}</th>
                    <th scope="col" className="px-6 py-3">{t('description')}</th>
                    <th scope="col" className="px-6 py-3 text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {client.transactions.map(tx => (
                    <tr key={tx.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                      <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{tx.description}</td>
                      <td className={`px-6 py-4 text-right font-bold ${getTransactionAmountClass(tx.type)}`}>
                        {getTransactionSign(tx.type)} {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientFinances;