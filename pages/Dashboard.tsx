import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocalization } from '../hooks/useLocalization';
import Card from '../components/Card';
import { FileStack, Users, UserPlus, Clock, Briefcase, Cpu } from 'lucide-react';
import { api } from '../services/api';
import { RequestStatus, ClientStatus, SupplierStatus, AgentStatus } from '../types';
import Spinner from '../components/Spinner';

const Dashboard: React.FC = () => {
  const { t } = useLocalization();

  const [stats, setStats] = useState([
    { titleKey: 'active_requests', value: 0, icon: FileStack, color: 'blue', link: '/requests' },
    { titleKey: 'active_clients', value: 0, icon: Users, color: 'green', link: '/clients' },
    { titleKey: 'new_requests', value: 0, icon: UserPlus, color: 'yellow', link: '/requests' },
    { titleKey: 'requests_in_progress', value: 0, icon: Clock, color: 'orange', link: '/requests' },
    { titleKey: 'active_suppliers', value: 0, icon: Briefcase, color: 'purple', link: '/suppliers' },
    { titleKey: 'active_agents', value: 0, icon: Cpu, color: 'red', link: '/agents' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.fetchClientRequests(),
      api.fetchClients(),
      api.fetchSuppliers(),
      api.fetchAgents(),
    ]).then(([requests, clients, suppliers, agents]) => {
      const activeRequests = requests.filter(r => r.status === RequestStatus.SUBMITTED || r.status === RequestStatus.IN_PROGRESS).length;
      const activeClients = clients.filter(c => c.status === ClientStatus.ACTIVE).length;
      const newRequests = requests.filter(r => r.status === RequestStatus.SUBMITTED).length;
      const requestsInProgress = requests.filter(r => r.status === RequestStatus.IN_PROGRESS).length;
      const activeSuppliers = suppliers.filter(s => s.status === SupplierStatus.ACTIVE).length;
      const activeAgents = agents.filter(a => a.status === AgentStatus.ACTIVE || a.status === AgentStatus.PROCESSING).length;

      setStats([
        { titleKey: 'active_requests', value: activeRequests, icon: FileStack, color: 'blue', link: '/requests' },
        { titleKey: 'active_clients', value: activeClients, icon: Users, color: 'green', link: '/clients' },
        { titleKey: 'new_requests', value: newRequests, icon: UserPlus, color: 'yellow', link: '/requests' },
        { titleKey: 'requests_in_progress', value: requestsInProgress, icon: Clock, color: 'orange', link: '/requests' },
        { titleKey: 'active_suppliers', value: activeSuppliers, icon: Briefcase, color: 'purple', link: '/suppliers' },
        { titleKey: 'active_agents', value: activeAgents, icon: Cpu, color: 'red', link: '/agents' },
      ]);
      setLoading(false);
    });
  }, []);

  const colorClasses: Record<string, { bg: string, text: string }> = {
    green: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-500 dark:text-green-400' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-500 dark:text-blue-400' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-500 dark:text-yellow-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-500 dark:text-orange-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-500 dark:text-purple-400' },
    red: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-500 dark:text-red-400' },
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('dashboard')}</h1>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map(stat => (
            <Link to={stat.link} key={stat.titleKey}>
              <Card className="hover:shadow-lg hover:border-indigo-500 border-2 border-transparent transition-all duration-300">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full ${colorClasses[stat.color]?.bg || ''} ${colorClasses[stat.color]?.text || ''} mr-4`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t(stat.titleKey)}</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{stat.value}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;