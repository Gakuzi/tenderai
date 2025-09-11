import React, { useState, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import Card from '../components/Card';
import { api } from '../services/api';
import { FinancialTransaction, FinancialDocument, Client, FinancialTransactionType, FinancialDocumentType } from '../types';
import Spinner from '../components/Spinner';
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, RefreshCw, FilePlus, X } from 'lucide-react';

type FormType = 'credit' | 'debit' | 'refund' | 'document';

const Finances: React.FC = () => {
  const { t } = useLocalization();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [formType, setFormType] = useState<FormType | null>(null);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState<FinancialDocumentType>(FinancialDocumentType.ACT);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const fetchData = () => {
    setLoading(true);
    Promise.all([
        api.fetchAllTransactions(),
        api.fetchFinancialDocuments(),
        api.fetchClients()
    ]).then(([transData, docsData, clientsData]) => {
        setTransactions(transData);
        setDocuments(docsData);
        setClients(clientsData);
        if (clientsData.length > 0) {
            setSelectedClientId(clientsData[0].id);
        }
        setLoading(false);
    })
  }

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormType(null);
    setAmount('');
    setDescription('');
    if (clients.length > 0) setSelectedClientId(clients[0].id);
    setDocType(FinancialDocumentType.ACT);
  }

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formType || isSubmitting || !selectedClientId || !amount) return;
    
    setIsSubmitting(true);
    const transactionTypeMap = {
        'credit': 'CREDIT' as FinancialTransactionType,
        'debit': 'DEBIT' as FinancialTransactionType,
        'refund': 'REFUND' as FinancialTransactionType,
    };
    
    const transactionType = transactionTypeMap[formType as 'credit' | 'debit' | 'refund'];
    if (!transactionType) return;
    
    api.createFinancialTransaction(selectedClientId, {
        amount: parseFloat(amount),
        description: description || t(formType),
        type: transactionType
    }).then(() => {
        setIsSubmitting(false);
        resetForm();
        fetchData(); // Refresh data
    });
  }
  
  const handleDocumentSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(isSubmitting || !selectedClientId) return;

      setIsSubmitting(true);
      const clientName = clients.find(c => c.id === selectedClientId)?.name || '';

      api.createFinancialDocument({
          clientId: selectedClientId,
          clientName: clientName,
          type: docType
      }).then(() => {
          setIsSubmitting(false);
          resetForm();
          fetchData();
      });
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(val);

  const renderForm = () => {
      if (!formType) return null;
      
      const isDocumentForm = formType === 'document';
      
      return (
          <Card className="mb-6">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">{isDocumentForm ? t('new_document') : t('new_operation')}</h2>
                  <button onClick={resetForm} className="p-1 rounded-full hover:bg-gray-700"><X className="h-5 w-5"/></button>
              </div>

              <form onSubmit={isDocumentForm ? handleDocumentSubmit : handleTransactionSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                      <label className="block text-sm font-medium mb-1">{t('select_client')}</label>
                      <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
                  
                  {isDocumentForm ? (
                     <div>
                        <label className="block text-sm font-medium mb-1">{t('document_type')}</label>
                        <select value={docType} onChange={e => setDocType(e.target.value as FinancialDocumentType)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                           <option value={FinancialDocumentType.ACT}>{t('create_act')}</option>
                           <option value={FinancialDocumentType.CONTRACT}>{t('create_contract')}</option>
                           <option value={FinancialDocumentType.RECONCILIATION}>{t('create_reconciliation')}</option>
                        </select>
                    </div>
                  ) : (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('amount')}</label>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('description')}</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t(formType)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                    </>
                  )}
                  
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center">
                    {isSubmitting ? <Spinner/> : (isDocumentForm ? t('generate') : t('create_operation'))}
                  </button>
              </form>
          </Card>
      );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('finances')}</h1>
      
       <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-3">{t('create_operation')}</h2>
        <div className="flex flex-wrap gap-2">
            <button onClick={() => setFormType('credit')} className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"><ArrowUpCircle className="h-4 w-4 mr-2"/> {t('credit_funds')}</button>
            <button onClick={() => setFormType('debit')} className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"><ArrowDownCircle className="h-4 w-4 mr-2"/> {t('debit_funds')}</button>
            <button onClick={() => setFormType('refund')} className="flex items-center px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"><RefreshCw className="h-4 w-4 mr-2"/> {t('refund')}</button>
            <button onClick={() => setFormType('document')} className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"><FilePlus className="h-4 w-4 mr-2"/> {t('create_act')}</button>
        </div>
      </Card>
      
      {renderForm()}

      {loading ? <Spinner/> : (
        <div className="grid grid-cols-1 gap-6">
            <Card>
                <h2 className="text-xl font-semibold mb-4">{t('transactions_history')}</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                       {/* Table content from ClientFinances */}
                       <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                            <tr>
                                <th className="px-6 py-3">{t('date')}</th>
                                <th className="px-6 py-3">{t('client')}</th>
                                <th className="px-6 py-3">{t('description')}</th>
                                <th className="px-6 py-3 text-right">{t('amount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id} className="border-b border-gray-700">
                                <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-medium text-white">{tx.clientName}</td>
                                <td className="px-6 py-4">{tx.description}</td>
                                <td className={`px-6 py-4 text-right font-bold ${tx.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                                    {tx.type === 'CREDIT' ? '+' : '-'} {formatCurrency(tx.amount)}
                                </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Card>
                <h2 className="text-xl font-semibold mb-4">{t('financial_documents')}</h2>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                       <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                            <tr>
                                <th className="px-6 py-3">{t('created_at')}</th>
                                <th className="px-6 py-3">{t('client')}</th>
                                <th className="px-6 py-3">{t('document_type')}</th>
                                <th className="px-6 py-3">{t('status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => (
                                <tr key={doc.id} className="border-b border-gray-700">
                                <td className="px-6 py-4">{new Date(doc.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-medium text-white">{doc.clientName}</td>
                                <td className="px-6 py-4">{t(`create_${doc.type.toLowerCase()}`)}</td>
                                <td className="px-6 py-4">{doc.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};

export default Finances;