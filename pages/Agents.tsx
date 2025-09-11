import React, { useState, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { Agent, AgentStatus } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
import { Cpu, Settings, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusClasses: Record<AgentStatus, string> = {
  [AgentStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [AgentStatus.IDLE]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  [AgentStatus.PROCESSING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};


const Agents: React.FC = () => {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchAgents().then(data => {
      setAgents(data);
      setLoading(false);
    });
  }, []);

  const handleRowClick = (id: string) => {
    navigate(`/agents/${id}/settings`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('available_agents')}</h1>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
            <Plus className="h-5 w-5 mr-2" />
            {t('create_agent')}
        </button>
      </div>
      <Card>
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">Имя агента</th>
                  <th scope="col" className="px-6 py-3">{t('description')}</th>
                  <th scope="col" className="px-6 py-3">{t('provider')}</th>
                  <th scope="col" className="px-6 py-3">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => (
                  <tr 
                    key={agent.id} 
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                    onClick={() => handleRowClick(agent.id)}
                  >
                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-white">{agent.name}</th>
                    <td className="px-6 py-4">{agent.description}</td>
                    <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                            {agent.provider}
                        </span>
                    </td>
                     <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[agent.status]}`}>
                        {t(`status_${agent.status}`)}
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

export default Agents;