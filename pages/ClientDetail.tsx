import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { Client, WorkModelType, FinancialTransactionType, ClientStatus } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
import { ArrowLeft, Building, FileText, MessageSquare, Plus, DollarSign, Save } from 'lucide-react';

// FIX: Define a specific type for tab identifiers to improve type safety.
type ClientDetailTab = 'companies' | 'templates' | 'integrations' | 'finances';

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocalization();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientDetailTab>('companies');
  const [newTransactionAmount, setNewTransactionAmount] = useState<number | ''>('');


  useEffect(() => {
    if (id) {
      api.fetchClientById(id).then(data => {
        setClient(data ? {...data} : null); // Create a mutable copy
        setLoading(false);
      });
    }
  }, [id]);

  const handleModelTypeChange = (type: WorkModelType) => {
    if (!client) return;
    const newClientData = { ...client };
    if (type === WorkModelType.PACKAGE && client.workModel.type !== WorkModelType.PACKAGE) {
        newClientData.workModel = {
            type: WorkModelType.PACKAGE,
            config: { packageName: 'Новый пакет', tenderCount: 10, price: 85000 },
            tendersRemaining: 10
        };
    } else if (type === WorkModelType.RESULT_ORIENTED && client.workModel.type !== WorkModelType.RESULT_ORIENTED) {
        newClientData.workModel = {
            type: WorkModelType.RESULT_ORIENTED,
            config: { baseCalculationFee: 8000, successBonusPercentage: 8 }
        };
    }
    setClient(newClientData);
  }
  
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(!client) return;
      const { name, value } = e.target;
      const newClientData = { ...client };
      
      const isNumericField = e.target.type === 'number';
      const parsedValue = isNumericField ? parseFloat(value) || 0 : value;

      if (newClientData.workModel.type === WorkModelType.PACKAGE) {
          (newClientData.workModel.config as any)[name] = parsedValue;
      } else if (newClientData.workModel.type === WorkModelType.RESULT_ORIENTED) {
          (newClientData.workModel.config as any)[name] = parsedValue;
      }
      setClient(newClientData);
  }

  const handleSaveChanges = () => {
      if (!client) return;
      setSaving(true);
      api.updateClient(client).then(updatedClient => {
          setClient({...updatedClient});
          setSaving(false);
      });
  }
  
  const handleAddTransaction = () => {
    if (!client || !newTransactionAmount) return;
    
    const newTransaction = {
      id: `tr${Date.now()}`,
      date: new Date().toISOString(),
      description: t('credit_balance'),
      amount: +newTransactionAmount,
      type: 'CREDIT' as FinancialTransactionType
    };

    const newClientData = { 
        ...client, 
        balance: client.balance + +newTransactionAmount,
        transactions: [newTransaction, ...client.transactions] 
    };
    
    setClient(newClientData);
    setNewTransactionAmount('');
    // In a real app, you'd also call api.updateClient here
  }

  const handleStatusChange = (newStatus: ClientStatus) => {
    if (client) {
      setClient({ ...client, status: newStatus });
    }
  };


  if (loading) return <Spinner />;
  if (!client) return <div>Client not found</div>;
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount);

  // FIX: Use the specific ClientDetailTab type for the tabId prop to avoid using `any`.
  const TabButton: React.FC<{tabId: ClientDetailTab, label: string, icon: React.ElementType}> = ({tabId, label, icon: Icon}) => (
    <button 
        onClick={() => setActiveTab(tabId)}
        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === tabId ? 'bg-indigo-500 text-white' : 'hover:bg-gray-700'}`}
    >
        <Icon className="h-5 w-5 mr-2" />
        {label}
    </button>
  );

  return (
    <div>
      <Link to="/clients" className="flex items-center text-sm text-indigo-500 hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1"/>
        {t('back_to_clients')}
      </Link>
      <div className="flex items-start mb-6">
        <div className="flex items-center flex-grow">
            <img src={client.logoUrl} alt={`${client.name} logo`} className="w-16 h-16 rounded-full mr-4 object-cover"/>
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{client.name}</h1>
                <p className="text-lg font-semibold text-green-400">{formatCurrency(client.balance)}</p>
            </div>
        </div>
        <div className="ml-auto flex-shrink-0">
            <label htmlFor="client-status" className="sr-only">{t('status')}</label>
            <select
                id="client-status"
                value={client.status}
                onChange={(e) => handleStatusChange(e.target.value as ClientStatus)}
                className="px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                {Object.values(ClientStatus).map(s => (
                    <option key={s} value={s}>{t(`status_${s}`)}</option>
                ))}
            </select>
        </div>
      </div>

      <Card>
        <div className="border-b border-gray-700 mb-4">
            <nav className="flex space-x-2">
                <TabButton tabId="companies" label={t('companies')} icon={Building} />
                <TabButton tabId="finances" label={t('finances_and_model')} icon={DollarSign} />
                <TabButton tabId="templates" label={t('templates')} icon={FileText} />
                <TabButton tabId="integrations" label={t('integrations')} icon={MessageSquare} />
            </nav>
        </div>
        
        <div>
            {activeTab === 'companies' && (
                <div>
                    <h3 className="text-lg font-semibold mb-3">{t('companies')}</h3>
                    <ul className="space-y-2 mb-4">
                       {client.companies.map(c => (
                         <li key={c.id} className="p-3 bg-gray-700 rounded-md">
                           <p className="font-bold">{c.name}</p>
                           <p className="text-sm text-gray-400">ИНН: {c.inn}, КПП: {c.kpp}</p>
                         </li>
                       ))}
                    </ul>
                    <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                        <Plus className="h-4 w-4 mr-2"/> {t('add_company')}
                    </button>
                </div>
            )}
            {activeTab === 'finances' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left side: Model Configuration */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">{t('work_model')}</h3>
                        <div className="flex space-x-4">
                           <label className="flex items-center">
                               <input type="radio" name="workModel" checked={client.workModel.type === WorkModelType.PACKAGE} onChange={() => handleModelTypeChange(WorkModelType.PACKAGE)} className="form-radio h-4 w-4 text-indigo-600"/>
                               <span className="ml-2">{t('package_model')}</span>
                           </label>
                           <label className="flex items-center">
                               <input type="radio" name="workModel" checked={client.workModel.type === WorkModelType.RESULT_ORIENTED} onChange={() => handleModelTypeChange(WorkModelType.RESULT_ORIENTED)} className="form-radio h-4 w-4 text-indigo-600"/>
                               <span className="ml-2">{t('result_oriented_model')}</span>
                           </label>
                        </div>

                        <div className="p-4 bg-gray-900/50 rounded-md">
                            <h4 className="font-semibold mb-3">{t('model_settings')}</h4>
                            {client.workModel.type === WorkModelType.PACKAGE && (
                                <div className="space-y-3">
                                    <div><label className="text-sm text-gray-400">{t('package_name')}</label><input type="text" name="packageName" value={client.workModel.config.packageName} onChange={handleConfigChange} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/></div>
                                    <div><label className="text-sm text-gray-400">{t('tender_count')}</label><input type="number" name="tenderCount" value={client.workModel.config.tenderCount} onChange={handleConfigChange} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/></div>
                                    <div><label className="text-sm text-gray-400">{t('package_cost')}</label><input type="number" name="price" value={client.workModel.config.price} onChange={handleConfigChange} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/></div>
                                    <p className="text-sm">{t('tenders_remaining')}: <span className="font-bold">{client.workModel.tendersRemaining}</span></p>
                                </div>
                            )}
                             {client.workModel.type === WorkModelType.RESULT_ORIENTED && (
                                <div className="space-y-3">
                                    <div><label className="text-sm text-gray-400">{t('base_calculation_fee')}</label><input type="number" name="baseCalculationFee" value={client.workModel.config.baseCalculationFee} onChange={handleConfigChange} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/></div>
                                    <div><label className="text-sm text-gray-400">{t('success_bonus_percentage')}</label><input type="number" name="successBonusPercentage" value={client.workModel.config.successBonusPercentage} onChange={handleConfigChange} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/></div>
                                </div>
                            )}
                        </div>
                         <button onClick={handleSaveChanges} disabled={saving} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm">
                            {saving ? <Spinner /> : <><Save className="h-4 w-4 mr-2"/> {t('save_changes')}</>}
                        </button>
                    </div>

                    {/* Right side: Transactions */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">{t('transactions_history')}</h3>
                        <div className="space-y-3 mb-4">
                            <label className="text-sm">{t('add_transaction')}</label>
                            <div className="flex gap-2">
                                <input type="number" value={newTransactionAmount} onChange={e => setNewTransactionAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder={t('amount')} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                                <button onClick={handleAddTransaction} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap">
                                    <Plus className="h-4 w-4 mr-2"/> {t('credit_balance')}
                                </button>
                            </div>
                        </div>
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {client.transactions.map(tx => (
                                <li key={tx.id} className="p-2 bg-gray-900/50 rounded-md flex justify-between">
                                    <div>
                                        <p className="font-medium">{tx.description}</p>
                                        <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                                    </div>
                                    <p className={`font-bold ${tx.type === 'DEBIT' ? 'text-red-400' : 'text-green-400'}`}>
                                        {tx.type === 'DEBIT' ? '-' : '+'} {formatCurrency(tx.amount)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            {activeTab === 'templates' && (
                 <div>
                    <h3 className="text-lg font-semibold mb-3">{t('templates')}</h3>
                     <ul className="space-y-2 mb-4">
                       {client.templates.map(t => (
                         <li key={t.id} className="p-3 bg-gray-700 rounded-md">
                           <a href={t.fileUrl} className="font-bold text-indigo-400 hover:underline">{t.name}</a>
                           <p className="text-sm text-gray-400">Тип: {t.type}</p>
                         </li>
                       ))}
                    </ul>
                    <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                        <Plus className="h-4 w-4 mr-2"/> {t('add_template')}
                    </button>
                </div>
            )}
            {activeTab === 'integrations' && (
                 <div>
                    <h3 className="text-lg font-semibold mb-3">{t('messenger_integrations')}</h3>
                    <form className="space-y-4">
                         <div>
                            <label htmlFor="telegram" className="block text-sm font-medium">{t('telegram_bot_token')}</label>
                            <input 
                                type="text" 
                                id="telegram" 
                                defaultValue={client.integrations.telegramBotToken || ''}
                                className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{t('save_changes')}</button>
                    </form>
                </div>
            )}
        </div>
      </Card>
    </div>
  );
};

export default ClientDetail;