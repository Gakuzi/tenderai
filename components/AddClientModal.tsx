import React, { useState, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import Card from './Card';
import Spinner from './Spinner';
import { X, Copy, CheckCircle } from 'lucide-react';

interface AddClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ onClose, onSuccess }) => {
  const { t } = useLocalization();
  const [clientName, setClientName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1 for form, 2 for success
  const [copied, setCopied] = useState(false);


  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const password = generatePassword();
    try {
        await api.createClient({
            name: clientName,
            contactPerson: contactPerson,
            email: email,
            password: password,
        });
        setGeneratedPassword(password);
        setStep(2); // Move to success step
    } catch (err) {
        setError('Failed to create client. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const renderForm = () => (
     <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="client-name" className="block text-sm font-medium mb-1">{t('client_name')}</label>
            <input type="text" id="client-name" value={clientName} onChange={e => setClientName(e.target.value)} required placeholder={t('client_name_placeholder')} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
        </div>
        <div>
            <label htmlFor="contact-person" className="block text-sm font-medium mb-1">{t('contact_person_name')}</label>
            <input type="text" id="contact-person" value={contactPerson} onChange={e => setContactPerson(e.target.value)} required className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
        </div>
        <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">{t('contact_person_email')}</label>
            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        
        <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700">{t('cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 flex items-center disabled:opacity-50">
                {isSubmitting && <Spinner />}
                {t('add_client')}
            </button>
        </div>
    </form>
  );

  const renderSuccess = () => (
    <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">{t('client_created_successfully')}</h2>
        <p className="text-sm text-gray-400 mb-4">{t('generated_password_instruction')}</p>
        <div className="relative p-3 bg-gray-900 rounded-md text-lg font-mono text-center">
            <span>{generatedPassword}</span>
            <button onClick={handleCopy} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-white">
                {copied ? <CheckCircle className="h-5 w-5 text-green-400"/> : <Copy className="h-5 w-5"/>}
            </button>
        </div>
         <button onClick={onSuccess} className="mt-6 w-full px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">Готово</button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
        <Card className="w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="h-5 w-5"/></button>
            <h2 className="text-xl font-bold mb-4">{t('new_client_creation')}</h2>
            {step === 1 ? renderForm() : renderSuccess()}
        </Card>
    </div>
  )
};

export default AddClientModal;