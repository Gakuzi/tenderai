import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { Agent, AgentModel } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
import { Save, ArrowLeft } from 'lucide-react';

const AgentSettings: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLocalization();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const models: AgentModel[] = ['Gemini 2.5 Flash', 'Gemini 2.5 Pro', 'ChatGPT-4', 'YandexGPT', 'GigaChat'];

  useEffect(() => {
    if (id) {
      api.fetchAgentById(id).then(data => {
        setAgent(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (agent) {
        setSaving(true);
        api.updateAgent(agent).then(() => {
            setSaving(false);
            navigate('/agents');
        });
    }
  };

  if (loading) return <Spinner />;
  if (!agent) return <div>Agent not found</div>;

  return (
    <div>
       <button onClick={() => navigate('/agents')} className="flex items-center text-sm text-indigo-500 hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1"/>
        {t('back_to_agents')}
      </button>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('agent_settings')}: {agent.name}</h1>
      
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Card>
                    <h2 className="text-xl font-semibold mb-4">{t('system_prompt')}</h2>
                    <textarea
                        value={agent.systemPrompt}
                        onChange={(e) => setAgent({...agent, systemPrompt: e.target.value})}
                        rows={10}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={t('prompt_placeholder')}
                    />
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <h2 className="text-xl font-semibold mb-4">{t('model')}</h2>
                    <select
                        value={agent.provider}
                        onChange={(e) => setAgent({...agent, provider: e.target.value as AgentModel})}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    >
                        {models.map(model => <option key={model} value={model}>{model}</option>)}
                    </select>
                </Card>
                <Card>
                    <h2 className="text-xl font-semibold mb-4">{t('proxy_settings')}</h2>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <input
                                id="enable-proxy"
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                checked={agent.proxy.enabled}
                                onChange={(e) => setAgent({...agent, proxy: {...agent.proxy, enabled: e.target.checked}})}
                            />
                            <label htmlFor="enable-proxy" className="ml-2 block text-sm">{t('enable_proxy')}</label>
                        </div>
                        {agent.proxy.enabled && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium">{t('proxy_address')}</label>
                                    <input 
                                        type="text"
                                        value={agent.proxy.host || ''}
                                        onChange={(e) => setAgent({...agent, proxy: {...agent.proxy, host: e.target.value}})}
                                        className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('port')}</label>
                                    <input 
                                        type="number"
                                        value={agent.proxy.port || ''}
                                        onChange={(e) => setAgent({...agent, proxy: {...agent.proxy, port: parseInt(e.target.value, 10)}})}
                                        className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>
        </div>
        <div className="mt-6">
            <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
                {saving ? <Spinner /> : <><Save className="h-5 w-5 mr-2" /> {t('save_changes')}</>}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AgentSettings;
