import React from 'react';
import { useLocalization } from '../hooks/useLocalization';
import Card from '../components/Card';
import { Plus } from 'lucide-react';

const Settings: React.FC = () => {
  const { t } = useLocalization();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('settings')}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">{t('profile')}</h2>
            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input type="text" id="name" defaultValue="Demo User" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" id="email" defaultValue="user@tendera.ai" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{t('save_changes')}</button>
            </form>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold mb-4">{t('notifications')}</h2>
            <div className="flex items-center">
              <input id="email-notifications" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" defaultChecked/>
              <label htmlFor="email-notifications" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">{t('email_notifications')}</label>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
           <Card>
            <h2 className="text-xl font-semibold mb-4">{t('network_and_proxies')}</h2>
            <form className="space-y-4">
                <div className="flex items-center">
                    <input id="enable-proxy" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                    <label htmlFor="enable-proxy" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">{t('enable_global_proxy')}</label>
                </div>
                <div>
                    <label htmlFor="proxy-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tunnel/Proxy URL</label>
                    <input type="text" id="proxy-url" placeholder="http://user:pass@host:port" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                 <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{t('save_changes')}</button>
            </form>
           </Card>
           <Card>
            <h2 className="text-xl font-semibold mb-4">{t('platform_credentials')}</h2>
            <ul className="space-y-2 mb-4">
                <li className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <span>zakupki.gov.ru</span>
                    <span>demo_user</span>
                </li>
            </ul>
            <form className="space-y-4">
                <div>
                    <label htmlFor="platform-name" className="block text-sm font-medium">{t('platform_name')}</label>
                    <input type="text" id="platform-name" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                 <div>
                    <label htmlFor="platform-login" className="block text-sm font-medium">{t('login')}</label>
                    <input type="text" id="platform-login" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                 <div>
                    <label htmlFor="platform-password" className="block text-sm font-medium">{t('password')}</label>
                    <input type="password" id="platform-password" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <button type="button" className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2"/> {t('add_platform')}
                </button>
            </form>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
