import React, { useState, useEffect } from 'react';
import { MessageSquare, QrCode, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Card from './Card';

interface WhatsAppIntegrationProps {
  companyId: string;
  onConnectionChange?: (isConnected: boolean) => void;
}

interface WhatsAppStatus {
  success: boolean;
  status: string;
  connected: boolean;
  info?: {
    pushname: string;
    phone: string;
    platform: string;
  };
  error?: string;
}

interface QRCodeData {
  success: boolean;
  qrCode?: string;
  expires?: string;
  message?: string;
}

const WhatsAppIntegration: React.FC<WhatsAppIntegrationProps> = ({ 
  companyId, 
  onConnectionChange 
}) => {
  const [status, setStatus] = useState<WhatsAppStatus>({ success: false, status: 'not_initialized', connected: false });
  const [qrData, setQRData] = useState<QRCodeData>({ success: false });
  const [isInitializing, setIsInitializing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  
  // Проверка статуса при загрузке
  useEffect(() => {
    checkStatus();
  }, [companyId]);

  // Автообновление статуса каждые 10 секунд, если идет процесс авторизации
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (status.status === 'initializing' || (showQR && !status.connected)) {
      interval = setInterval(() => {
        checkStatus();
        if (showQR && !qrData.success) {
          getQRCode();
        }
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status.status, showQR, status.connected, qrData.success]);

  // Уведомляем родительский компонент об изменении статуса подключения
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(status.connected);
    }
  }, [status.connected, onConnectionChange]);

  const checkStatus = async () => {
    try {
      const response = await fetch(`http://localhost:3002/api/whatsapp/status/${companyId}`);
      const data: WhatsAppStatus = await response.json();
      
      setStatus(data);
      setLastChecked(new Date());
      
      // Если подключились, скрываем QR код
      if (data.connected) {
        setShowQR(false);
        setQRData({ success: false });
      }
    } catch (error) {
      console.error('Ошибка проверки статуса WhatsApp:', error);
      setStatus({ 
        success: false, 
        status: 'error', 
        connected: false, 
        error: 'Network error' 
      });
    }
  };

  const initializeClient = async () => {
    setIsInitializing(true);
    
    try {
      const response = await fetch(`http://localhost:3002/api/whatsapp/initialize/${companyId}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatus(prev => ({ ...prev, status: 'initializing' }));
        
        // Ждем немного и получаем QR код
        setTimeout(() => {
          getQRCode();
          setShowQR(true);
        }, 2000);
      } else {
        console.error('Ошибка инициализации:', result.error);
      }
    } catch (error) {
      console.error('Ошибка инициализации WhatsApp:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const getQRCode = async () => {
    try {
      const response = await fetch(`http://localhost:3002/api/whatsapp/qr/${companyId}`);
      const data: QRCodeData = await response.json();
      setQRData(data);
    } catch (error) {
      console.error('Ошибка получения QR кода:', error);
      setQRData({ success: false, message: 'Network error' });
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Отключить WhatsApp интеграцию?')) return;
    
    try {
      const response = await fetch(`http://localhost:3002/api/whatsapp/disconnect/${companyId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatus({ success: true, status: 'not_initialized', connected: false });
        setShowQR(false);
        setQRData({ success: false });
      }
    } catch (error) {
      console.error('Ошибка отключения WhatsApp:', error);
    }
  };

  const sendTestMessage = async () => {
    if (!status.connected) return;
    
    const phoneNumber = prompt('Введите номер телефона для тестового сообщения:');
    if (!phoneNumber) return;
    
    try {
      const response = await fetch(`http://localhost:3002/api/whatsapp/send/${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          message: `🚀 Тест WhatsApp интеграции из TenderAI!\n\n⏰ Время: ${new Date().toLocaleString()}\n🏢 Компания: ${companyId.slice(-8)}\n\n✅ Интеграция работает!`
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Тестовое сообщение отправлено!');
      } else {
        alert('Ошибка отправки: ' + result.error);
      }
    } catch (error) {
      alert('Ошибка отправки сообщения');
    }
  };

  const getStatusColor = () => {
    if (status.connected) return 'text-green-400';
    if (status.status === 'error') return 'text-red-400';
    if (status.status === 'initializing') return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getStatusIcon = () => {
    if (status.connected) return <CheckCircle className="h-5 w-5 text-green-400" />;
    if (status.status === 'error') return <AlertCircle className="h-5 w-5 text-red-400" />;
    if (status.status === 'initializing' || isInitializing) return <Loader className="h-5 w-5 text-yellow-400 animate-spin" />;
    return <MessageSquare className="h-5 w-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (status.connected && status.info) {
      return `Подключен: ${status.info.pushname} (${status.info.phone})`;
    }
    
    switch (status.status) {
      case 'connected': return 'Подключен';
      case 'initializing': return 'Инициализация...';
      case 'error': return `Ошибка: ${status.error || 'Unknown error'}`;
      case 'not_initialized': return 'Не инициализирован';
      default: return status.status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Статус подключения */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-md">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h4 className="font-semibold text-white">WhatsApp</h4>
            <p className={`text-sm ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            <p className="text-xs text-gray-500">
              Обновлено: {lastChecked.toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {!status.connected ? (
            <button
              onClick={initializeClient}
              disabled={isInitializing || status.status === 'initializing'}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-md flex items-center"
            >
              {isInitializing || status.status === 'initializing' ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Подключить
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={sendTestMessage}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md"
              >
                Тест
              </button>
              <button
                onClick={disconnect}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md"
              >
                Отключить
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QR код для авторизации */}
      {showQR && !status.connected && (
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <QrCode className="h-6 w-6 text-green-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Авторизация WhatsApp</h3>
          </div>
          
          {qrData.success && qrData.qrCode ? (
            <div className="space-y-4">
              <div className="inline-block p-4 bg-white rounded-lg">
                <img 
                  src={qrData.qrCode} 
                  alt="WhatsApp QR Code" 
                  className="max-w-[200px] max-h-[200px]"
                />
              </div>
              
              <div className="text-sm text-gray-300 space-y-2">
                <p>📱 <strong>Отсканируйте QR код в WhatsApp:</strong></p>
                <p>1. Откройте WhatsApp на телефоне</p>
                <p>2. Меню (⋮) → Привязанные устройства</p>
                <p>3. Привязать устройство → Отсканируйте код</p>
                
                {qrData.expires && (
                  <p className="text-yellow-400 text-xs">
                    ⏰ QR код истекает: {new Date(qrData.expires).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">
              {qrData.message ? (
                <p>❌ {qrData.message}</p>
              ) : (
                <div className="flex items-center justify-center">
                  <Loader className="h-6 w-6 animate-spin mr-2" />
                  <p>Генерация QR кода...</p>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={() => setShowQR(false)}
            className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md"
          >
            Скрыть
          </button>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppIntegration;
