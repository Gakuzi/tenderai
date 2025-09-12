import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { ClientRequest } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
// import MessengerManager from '../components/MessengerManager'; // Временно отключен
import { Cpu, File, CheckCircle, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const RequestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocalization();
  const { userRole } = useAuth();
  const [request, setRequest] = useState<ClientRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentLoading, setAgentLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (id) {
      api.fetchClientRequestById(id).then(data => {
        setRequest(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  const handleRunAnalysis = () => {
    setAgentLoading(true);
    api.invokeAgent('ag1', { requestId: id, description: request?.tenderDescription }).then(response => {
      console.log('Agent response:', response);
    }).finally(() => {
        setAgentLoading(false);
    });
  };
  
  if (loading) return <Spinner />;
  if (!request) return <div>Request not found</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('process_request')} for {request.clientName}</h1>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Received at: {new Date(request.receivedAt).toLocaleString()}</p>
        {messageCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            <MessageCircle className="h-3 w-3 mr-1" />
            {messageCount} переписок
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <h2 className="text-xl font-semibold mb-4">Request Description</h2>
                <p>{request.tenderDescription}</p>
            </Card>
             <Card>
                <h2 className="text-xl font-semibold mb-4">Attached Documents</h2>
                <ul>
                    {request.documents.map(doc => (
                        <li key={doc.name} className="flex items-center text-indigo-500 hover:underline">
                            <File className="mr-2 h-4 w-4"/>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">{doc.name}</a>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
        <div className="space-y-6">
          {/* Мессенджеры компании - временно отключены */}
          {request.company && (
            <Card>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">Коммуникации</h3>
                <p className="text-gray-400 text-sm">Система интеграций временно отключена для исправления</p>
              </div>
            </Card>
          )}
          
          {userRole !== 'Manager' && (
            <>
              <Card>
                <h3 className="text-lg font-semibold mb-3">Analysis</h3>
                <button
                  onClick={handleRunAnalysis}
                  disabled={agentLoading}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {agentLoading ? <Spinner/> : <><Cpu className="mr-2 h-4 w-4"/> Run Tender Scout</>}
                </button>
              </Card>
              <Card>
                <h3 className="text-lg font-semibold mb-3">Actions</h3>
                <button
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                <CheckCircle className="mr-2 h-4 w-4"/> Mark as Complete
                </button>
              </Card>
            </>
          )}
           {userRole === 'Manager' && (
            <Card>
                <h3 className="text-lg font-semibold mb-3">Status</h3>
                <p className="text-sm text-gray-400">Request processing is handled by Tender Specialists. Managers have read-only access.</p>
            </Card>
           )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;