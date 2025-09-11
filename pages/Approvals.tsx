
import React, { useState, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { Approval, ApprovalStatus } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
import { Check, X } from 'lucide-react';

const statusClasses: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [ApprovalStatus.APPROVED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [ApprovalStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const Approvals: React.FC = () => {
  const { t } = useLocalization();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchApprovals().then(data => {
      setApprovals(data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('pending_actions')}</h1>
      <Card>
        {loading ? <Spinner /> : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {approvals.map(approval => (
              <li key={approval.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">{approval.action}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Запрошено: {approval.requestedBy} в {new Date(approval.requestedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusClasses[approval.status]}`}>
                    {approval.status}
                  </span>
                  {approval.status === ApprovalStatus.PENDING && (
                    <>
                      <button className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200">
                        <Check className="h-5 w-5" />
                      </button>
                      <button className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200">
                        <X className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default Approvals;
