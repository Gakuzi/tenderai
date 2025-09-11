import React, { useState, useMemo } from 'react';
import { Company, PlatformCredential, CommunicationChannel, CommunicationChannelType } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import Card from '../Card';
import Spinner from '../Spinner';
import { X, Plus, Trash2, ShieldOff, AlertTriangle, CheckCircle, Link2, Key, MessageSquare, QrCode, Search } from 'lucide-react';
import { RUSSIAN_TENDER_PLATFORMS } from '../../constants';

interface CompanyWizardModalProps {
  company: Company | null; // null for new company, Company object for editing
  onClose: () => void;
  onSuccess: () => void;
}

const getDefaultCompanyData = (): Omit<Company, 'id'> => ({
    name: '',
    inn: '',
    kpp: '',
    isActive: true,
    platformCredentials: [],
    communicationChannels: [],
});

const CompanyWizardModal: React.FC<CompanyWizardModalProps> = ({ company, onClose, onSuccess }) => {
  const { t } = useLocalization();
  const { impersonatedClient } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [companyData, setCompanyData] = useState<Omit<Company, 'id'> | Company>(
    company ? JSON.parse(JSON.stringify(company)) : getDefaultCompanyData()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for sub-modals within the wizard
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [isQRModalOpen, setQRModalOpen] = useState<CommunicationChannelType | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<{name: string, url: string} | null>(null);
  const [platformStep, setPlatformStep] = useState(1);
  
  const isEditing = !!company;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNext = () => setCurrentStep(prev => prev + 1);
  const handleBack = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = async () => {
      if(!impersonatedClient) return;
      setIsLoading(true);
      setError('');
      try {
          if (isEditing) {
              await api.updateCompany(impersonatedClient.id, companyData as Company);
          } else {
              await api.createCompany(impersonatedClient.id, companyData);
          }
          onSuccess();
      } catch (e) {
          setError('Failed to save company.');
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleDeactivate = async () => {
      if(!impersonatedClient || !isEditing) return;
      if (window.confirm(t('deactivate_confirm_text'))) {
          const updatedCompany = { ...companyData as Company, isActive: !companyData.isActive };
          await api.updateCompany(impersonatedClient.id, updatedCompany);
          onSuccess();
      }
  }

  const handleDelete = async () => {
    if(!impersonatedClient || !isEditing) return;
    if (window.confirm(t('delete_confirm_text'))) {
        await api.deleteCompany(impersonatedClient.id, (companyData as Company).id);
        onSuccess();
    }
  }

  // --- Platform Connection Logic ---
  const openPlatformModal = () => {
    setSelectedPlatform(null);
    setPlatformStep(1);
    setIsPlatformModalOpen(true);
  }

  const handlePlatformConnectClick = () => {
      if (!selectedPlatform) return;
      window.open(selectedPlatform.url, '_blank', 'noopener,noreferrer');
      setPlatformStep(2);
  }

  const handleSavePlatform = () => {
    if (!selectedPlatform) return;
    const updatedPlatform: PlatformCredential = {
        id: `pc${Date.now()}`,
        platformName: selectedPlatform.name,
        url: selectedPlatform.url,
        status: 'Connected',
        sessionData: '{"simulated_session": "true"}'
    };
    setCompanyData(prev => ({
        ...prev,
        platformCredentials: [...prev.platformCredentials, updatedPlatform]
    }));
    setIsPlatformModalOpen(false);
  }

  const handleRemovePlatform = (id: string) => {
    setCompanyData(prev => ({
        ...prev,
        platformCredentials: prev.platformCredentials.filter(p => p.id !== id)
    }));
  }

  // --- Communication Channel Logic ---
// FIX: Use CommunicationChannelType enum instead of string literals to fix type errors.
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const email = e.target.value;
      setCompanyData(prev => {
          const existingEmailChannel = prev.communicationChannels.find(c => c.type === CommunicationChannelType.EMAIL);
          if(existingEmailChannel) {
              return {...prev, communicationChannels: prev.communicationChannels.map(c => c.type === CommunicationChannelType.EMAIL ? {...c, identifier: email, status: 'Connected'} : c)}
          } else {
              return {...prev, communicationChannels: [...prev.communicationChannels, {id: `chan${Date.now()}`, type: CommunicationChannelType.EMAIL, identifier: email, status: 'Connected'}]}
          }
      });
  }

  const handleConnectMessenger = (type: CommunicationChannelType) => {
    const existing = companyData.communicationChannels.find(c => c.type === type);
    if (existing) { // Disconnect
        setCompanyData(prev => ({...prev, communicationChannels: prev.communicationChannels.filter(c => c.type !== type)}));
    } else { // Connect
        setQRModalOpen(type);
    }
  }
  
  const handleQRScanConfirm = () => {
      if(!isQRModalOpen) return;
      const newChannel: CommunicationChannel = {
          id: `chan${Date.now()}`,
          type: isQRModalOpen,
          identifier: 'Session Active',
          status: 'Connected',
      };
      setCompanyData(prev => ({...prev, communicationChannels: [...prev.communicationChannels, newChannel]}));
      setQRModalOpen(null);
  }


  const StepIndicator = () => (
    <div className="mb-6 flex justify-center items-center space-x-2 sm:space-x-4">
        {[1,2,3,4].map(step => (
            <React.Fragment key={step}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm sm:text-base ${currentStep >= step ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    {step}
                </div>
                {step < 4 && <div className={`flex-1 h-0.5 ${currentStep > step ? 'bg-indigo-600' : 'bg-gray-700'}`}></div>}
            </React.Fragment>
        ))}
    </div>
  );

  const renderStep1 = () => (
    <div>
        <h3 className="text-lg font-semibold mb-4">{t('step_1_title')}</h3>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">{t('company_name')}</label>
                <input type="text" name="name" value={companyData.name} onChange={handleInputChange} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required/>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">{t('inn')}</label>
                <input type="text" name="inn" value={companyData.inn} onChange={handleInputChange} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required/>
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">{t('kpp')}</label>
                <input type="text" name="kpp" value={companyData.kpp} onChange={handleInputChange} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required/>
            </div>
        </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('connected_platforms')}</h3>
      <div className="space-y-3 mb-4">
        {companyData.platformCredentials.map(p => (
            <div key={p.id} className="p-3 bg-gray-900/50 rounded-md flex items-center justify-between">
                <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3"/>
                    <div>
                        <p className="font-semibold">{p.platformName}</p>
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline">{p.url}</a>
                    </div>
                </div>
                <button onClick={() => handleRemovePlatform(p.id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
            </div>
        ))}
      </div>
      <button onClick={openPlatformModal} className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-600 rounded-md hover:border-indigo-500 hover:text-indigo-400">
        <Plus className="h-5 w-5 mr-2"/> {t('add_platform')}
      </button>
    </div>
  );
  
  const renderStep3 = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('communication_channels')}</h3>
      <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium mb-1">{t('default_rfq_email')}</label>
            <input 
                type="email" 
                value={companyData.communicationChannels.find(c=>c.type === CommunicationChannelType.EMAIL)?.identifier || ''}
                onChange={handleEmailChange}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FIX: Use CommunicationChannelType enum members instead of string literals to resolve type errors. */}
            { ([CommunicationChannelType.TELEGRAM, CommunicationChannelType.WHATSAPP] as const).map(type => {
                const channel = companyData.communicationChannels.find(c => c.type === type);
                const isConnected = !!channel;
                return (
                    <button key={type} onClick={() => handleConnectMessenger(type)} className={`p-4 rounded-md text-left border-2 ${isConnected ? 'border-green-500 bg-green-900/30' : 'border-gray-600 bg-gray-900/50 hover:border-indigo-500'}`}>
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold">{type}</h4>
                            <span className={`text-xs font-semibold ${isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                                {isConnected ? t('connected') : t('not_connected')}
                            </span>
                        </div>
                        <p className="text-xs mt-1">{isConnected ? t('disconnect') : t(`connect_${type.toLowerCase()}`)}</p>
                    </button>
                )
            })}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('review_and_save')}</h3>
      <div className="space-y-4 text-sm p-4 bg-gray-900/50 rounded-md">
        <h4 className="font-bold border-b border-gray-700 pb-1 mb-2">{t('basic_information')}</h4>
        <p><strong>{t('company_name')}:</strong> {companyData.name}</p>
        <p><strong>{t('inn')}:</strong> {companyData.inn}</p>

        <h4 className="font-bold border-b border-gray-700 pb-1 mb-2 mt-4">{t('connected_platforms')}</h4>
        {companyData.platformCredentials.length > 0 ? companyData.platformCredentials.map(p => <p key={p.id}>- {p.platformName} ({t('connected')})</p>) : <p className="text-gray-400">None</p>}
        
        <h4 className="font-bold border-b border-gray-700 pb-1 mb-2 mt-4">{t('communication_channels')}</h4>
        {companyData.communicationChannels.length > 0 ? companyData.communicationChannels.map(c => <p key={c.id}>- {c.type}: {c.identifier} ({t('connected')})</p>) : <p className="text-gray-400">None</p>}
      </div>
    </div>
  );

  const PlatformConnectionModal = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredPlatforms = useMemo(() => 
        RUSSIAN_TENDER_PLATFORMS.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [searchTerm]
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4" onClick={() => setIsPlatformModalOpen(false)}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">{t('connection_process')}</h3>
                { platformStep === 1 ? (
                    <div className="space-y-4">
                        <div className="relative">
                           <input 
                                type="text" 
                                placeholder={t('search_platform')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full p-2 pl-10 border rounded-md dark:bg-gray-900 dark:border-gray-600"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {filteredPlatforms.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => setSelectedPlatform({name: p.name, url: p.loginUrl})}
                                    className={`w-full text-left p-3 rounded-md border-2 ${selectedPlatform?.url === p.loginUrl ? 'border-indigo-500 bg-indigo-900/50' : 'border-transparent bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                        <button onClick={handlePlatformConnectClick} disabled={!selectedPlatform} className="w-full mt-4 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {t('connect')}
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <Key className="h-12 w-12 text-yellow-400 mx-auto mb-4"/>
                        <p className="text-gray-300 mb-6">{t('connection_instruction')}</p>
                        <button onClick={handleSavePlatform} className="w-full px-4 py-2 rounded-md bg-green-600 hover:bg-green-700">{t('confirm_connection')}</button>
                    </div>
                )}
            </Card>
        </div>
    );
  }
  
  const QRConnectionModal = () => (
     <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center" onClick={() => setQRModalOpen(null)}>
        <Card className="w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">{t('scan_qr_code')}</h3>
            <p className="text-xs text-gray-400 mb-4">{t(isQRModalOpen === 'TELEGRAM' ? 'scan_qr_instruction_telegram' : 'scan_qr_instruction_whatsapp')}</p>
            <div className="p-4 bg-white rounded-md inline-block">
                {/* This would be a real QR code from the backend */}
                <img src="https://placehold.co/200x200/ffffff/000000?text=QR+CODE" alt="QR Code Placeholder"/>
            </div>
            <button onClick={handleQRScanConfirm} className="w-full mt-4 px-4 py-2 rounded-md bg-green-600 hover:bg-green-700">{t('confirm_scan')}</button>
        </Card>
    </div>
  );
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
        <Card className="w-full max-w-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="h-5 w-5"/></button>
            <h2 className="text-xl font-bold mb-4">{isEditing ? t('edit_company') : t('add_new_company')}</h2>
            <StepIndicator />
            <div className="min-h-[250px] py-4">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
            </div>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-gray-700 gap-4">
                <div>
                  {isEditing && (
                    <div className="flex gap-2">
                       <button onClick={handleDeactivate} className={`flex items-center text-sm px-3 py-2 rounded-md ${companyData.isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}>
                         <ShieldOff className="h-4 w-4 mr-2"/> {companyData.isActive ? t('deactivate_company') : 'Activate'}
                       </button>
                       <button onClick={handleDelete} className="flex items-center text-sm px-3 py-2 rounded-md bg-red-600 hover:bg-red-700">
                         <Trash2 className="h-4 w-4 mr-2"/> {t('delete_company')}
                       </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                    {currentStep > 1 && <button onClick={handleBack} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700">{t('back_step')}</button>}
                    {currentStep < 4 && <button onClick={handleNext} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">{t('next_step')}</button>}
                    {currentStep === 4 && (
                        <button onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center">
                            {isLoading ? <Spinner/> : (isEditing ? t('save_changes') : t('save'))}
                        </button>
                    )}
                </div>
            </div>
        </Card>
        {isPlatformModalOpen && <PlatformConnectionModal />}
        {isQRModalOpen && <QRConnectionModal />}
    </div>
  )
};

export default CompanyWizardModal;