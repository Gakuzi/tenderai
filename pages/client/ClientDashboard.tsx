import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../../components/Card';
import { FileStack, Clock, CheckCircle, PlusCircle } from 'lucide-react';
import { api } from '../../services/api';
import { ClientRequest, RequestStatus } from '../../types';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../hooks/useAuth';


const ClientDashboard: React.FC = () => {
  const { t } = useLocalization();
  const { impersonatedClient } = useAuth();
  const [stats, setStats] = useState([
    { titleKey: 'total_requests', value: 0, icon: FileStack, link: '/client/requests', color: 'blue' },
    { titleKey: 'in_progress', value: 0, icon: Clock, link: '/client/requests', color: 'yellow' },
    { titleKey: 'completed', value: 0, icon: CheckCircle, link: '/client/requests', color: 'green' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (impersonatedClient) {
      setLoading(true);
      api.fetchClientRequests(impersonatedClient.id).then((requests: ClientRequest[]) => {
        const total = requests.length;
        const inProgress = requests.filter(r => r.status === RequestStatus.IN_PROGRESS || r.status === RequestStatus.SUBMITTED).length;
        const completed = requests.filter(r => r.status === RequestStatus.COMPLETED).length;
        
        setStats([
          { titleKey: 'total_requests', value: total, icon: FileStack, link: '/client/requests', color: 'blue' },
          { titleKey: 'in_progress', value: inProgress, icon: Clock, link: '/client/requests', color: 'yellow' },
          { titleKey: 'completed', value: completed, icon: CheckCircle, link: '/client/requests', color: 'green' },
        ]);
        setLoading(false);
      });
    } else {
        setLoading(false);
    }
  }, [impersonatedClient]);
  
  const colorClasses: Record<string, { bg: string, text: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-500 dark:text-blue-300' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-500 dark:text-yellow-300' },
    green: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-500 dark:text-green-300' },
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('client_dashboard')}</h1>
      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map(stat => {
              const colors = colorClasses[stat.color] || {bg: 'bg-gray-100', text: 'text-gray-500'};
              return (
                  <Link to={stat.link} key={stat.titleKey}>
                      <Card className="hover:shadow-lg hover:border-indigo-500 border-2 border-transparent transition-all duration-300 h-full">
                      <div className="flex items-center">
                          <div className={`p-3 rounded-full ${colors.bg} ${colors.text} mr-4`}>
                          <stat.icon className="h-6 w-6" />
                          </div>
                          <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t(stat.titleKey)}</p>
                          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stat.value}</p>
                          </div>
                      </div>
                      </Card>
                  </Link>
              )
          })}
        </div>
      )}

      <div className="mt-8">
        <Card>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">Готовы начать новый проект?</h2>
                    <p className="text-gray-400">Создайте новую заявку, и наши агенты немедленно приступят к работе.</p>
                </div>
                <Link to="/client/new-request" className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    <PlusCircle className="h-5 w-5 mr-2" />
                    {t('new_request')}
                </Link>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;