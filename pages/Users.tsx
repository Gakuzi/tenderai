import React, { useState, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { Employee, SystemRole } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
import { Search, Plus, X } from 'lucide-react';

const roleClasses: Record<SystemRole, string> = {
    Admin: 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300',
    Manager: 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    Analyst: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    Developer: 'bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

const Users: React.FC = () => {
  const { t } = useLocalization();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchEmployees = () => {
    setLoading(true);
    api.fetchEmployees().then(data => {
      setEmployees(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const AddEmployeeModal: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [selectedRoles, setSelectedRoles] = useState<SystemRole[]>([]);

    const handleRoleChange = (role: SystemRole) => {
        setSelectedRoles(prev => 
            prev.includes(role) 
            ? prev.filter(r => r !== role) 
            : [...prev, role]
        );
    }
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        api.createEmployee({ name, email, roles: selectedRoles }).then(() => {
            setIsModalOpen(false);
            fetchEmployees();
        });
    }

    const availableRoles: SystemRole[] = ['Admin', 'Manager', 'Analyst', 'Developer'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{t('new_employee')}</h2>
                    <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('full_name')}</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">{t('email')}</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">{t('roles')}</label>
                        <div className="flex flex-wrap gap-2">
                            {availableRoles.map(role => (
                                <label key={role} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={selectedRoles.includes(role)}
                                        onChange={() => handleRoleChange(role)}
                                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>{t(role)}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700">{t('cancel')}</button>
                        <button type="submit" className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">{t('add_employee')}</button>
                    </div>
                </form>
            </Card>
        </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('employees')}</h1>
        <div className="flex items-center space-x-4">
            <div className="relative">
              <input type="text" placeholder={t('search')} className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
                <Plus className="h-5 w-5 mr-2" />
                {t('add_employee')}
            </button>
        </div>
      </div>
      <Card>
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">{t('full_name')}</th>
                  <th scope="col" className="px-6 py-3">{t('email')}</th>
                  <th scope="col" className="px-6 py-3">{t('roles')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      {employee.name}
                    </th>
                    <td className="px-6 py-4">{employee.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {employee.roles.map(role => (
                            <span key={role} className={`px-2 py-1 text-xs font-medium rounded-full ${roleClasses[role]}`}>
                                {t(role)}
                            </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {isModalOpen && <AddEmployeeModal/>}
    </div>
  );
};

export default Users;