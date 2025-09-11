import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { ClientRequest, RequestStatus } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';

const statusClasses: Record<RequestStatus, string> = {
  [RequestStatus.DRAFT]: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
  [RequestStatus.SUBMITTED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [RequestStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [RequestStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  [RequestStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const ClientRequests: React.FC = () => {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchClientRequests().then(data => {
      setRequests(data);
      setLoading(false);
    });
  }, []);

  const handleRowClick = (id: string) => {
    navigate(`/requests/${id}`);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('all_client_requests')}</h1>
      <Card>
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">{t('client_name')}</th>
                  <th scope="col" className="px-6 py-3">{t('companies')}</th>
                  <th scope="col" className="px-6 py-3">{t('tender_description')}</th>
                  <th scope="col" className="px-6 py-3">{t('received_at')}</th>
                  <th scope="col" className="px-6 py-3">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr 
                    key={request.id} 
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                    onClick={() => handleRowClick(request.id)}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{request.clientName}</td>
                    <td className="px-6 py-4">{request.companyName}</td>
                    <td className="px-6 py-4 max-w-sm truncate">{request.tenderDescription}</td>
                    <td className="px-6 py-4">{new Date(request.receivedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[request.status]}`}>
                        {t(`status_${request.status}`)}
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

export default ClientRequests;