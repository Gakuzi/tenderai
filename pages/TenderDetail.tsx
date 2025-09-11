
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { Tender, Bid, Supplier } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
import { Cpu, FileText, DollarSign, Briefcase } from 'lucide-react';

const TenderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocalization();
  const [tender, setTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [suggestedSuppliers, setSuggestedSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentLoading, setAgentLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      Promise.all([
        api.fetchTenderById(id),
        api.fetchBidsForTender(id),
      ]).then(([tenderData, bidsData]) => {
        setTender(tenderData || null);
        setBids(bidsData);
        setLoading(false);
      });
    }
  }, [id]);

  const handleRunAgent = (agentId: string, type: string) => {
    setAgentLoading(prev => ({ ...prev, [type]: true }));
    api.invokeAgent(agentId, { tenderId: id }).then(response => {
      console.log('Agent response:', response);
      // Here you would process the agent's response actions
    }).finally(() => {
        setAgentLoading(prev => ({ ...prev, [type]: false }));
    });
  };

  if (loading) return <Spinner />;
  if (!tender) return <div>Tender not found</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{tender.title}</h1>
      <a href={tender.etpUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:underline mb-6 block">
        {tender.etpUrl}
      </a>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">{t('tender_information')}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><strong>{t('initial_max_price')}:</strong></p>
              <p>{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(tender.nmck)}</p>
              <p><strong>{t('application_deadline')}:</strong></p>
              <p>{new Date(tender.deadline).toLocaleString()}</p>
              <p><strong>{t('status')}:</strong></p>
              <p>{tender.status}</p>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-4">{t('tender_items')}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2">{t('description')}</th>
                  <th className="text-right py-2">{t('quantity')}</th>
                  <th className="text-right py-2">{t('unit')}</th>
                </tr>
              </thead>
              <tbody>
                {tender.items.map(item => (
                  <tr key={item.id} className="border-b dark:border-gray-700">
                    <td className="py-2">{item.description}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold mb-3 flex items-center"><Briefcase className="mr-2 h-5 w-5"/>{t('suggested_suppliers')}</h3>
             <button
              onClick={() => handleRunAgent('ag2', 'supplier')}
              disabled={agentLoading['supplier']}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {agentLoading['supplier'] ? <Spinner/> : <><Cpu className="mr-2 h-4 w-4"/> {t('run_supplier_scout')}</>}
            </button>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold mb-3 flex items-center"><DollarSign className="mr-2 h-5 w-5"/>{t('bids_received')}</h3>
            <button
              onClick={() => handleRunAgent('ag3', 'price')}
              disabled={agentLoading['price']}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
             {agentLoading['price'] ? <Spinner/> : <><Cpu className="mr-2 h-4 w-4"/>{t('run_price_optimizer')}</>}
            </button>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold mb-3 flex items-center"><FileText className="mr-2 h-5 w-5"/>{t('document_generation')}</h3>
            <button
              onClick={() => handleRunAgent('ag4', 'docs')}
              disabled={agentLoading['docs']}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
             {agentLoading['docs'] ? <Spinner/> : <><Cpu className="mr-2 h-4 w-4"/>{t('generate_documents')}</>}
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TenderDetail;
