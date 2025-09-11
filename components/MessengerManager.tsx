import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Globe, QrCode, CheckCircle, AlertCircle, Loader, ExternalLink, MessageCircle, History } from 'lucide-react';
import Card from './Card';
import { messengerSessionsAPI, SessionLaunchResponse, SessionStatusResponse, MessageHistoryResponse } from '../api/messenger-sessions';

interface MessengerManagerProps {
  requestId: string;
  companyId: string;
  companyName: string;
  onMessagesUpdate?: (messageCount: number) => void;
}

interface SessionState {
  telegram?: {
    sessionId?: string;
    status: string;
    isConnected: boolean;
    userInfo?: { name: string; username?: string };
    webUrl?: string;
    needsAuth?: boolean;
    qrCode?: string;
    expiresAt?: string;
  };
  whatsapp?: {
    sessionId?: string;
    status: string;
    isConnected: boolean;
    userInfo?: { name: string; phone?: string };
    webUrl?: string;
    needsAuth?: boolean;
    qrCode?: string;
    expiresAt?: string;
  };
}

const MessengerManager: React.FC<MessengerManagerProps> = ({
  requestId,
  companyId,
  companyName,
  onMessagesUpdate
}) => {
  const [sessions, setSessions] = useState<SessionState>({});
  const [loading, setLoading] = useState<{telegram: boolean, whatsapp: boolean}>({telegram: false, whatsapp: false});
  const [showQR, setShowQR] = useState<{telegram: boolean, whatsapp: boolean}>({telegram: false, whatsapp: false});
  const [messageHistory, setMessageHistory] = useState<MessageHistoryResponse['data']>();
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Автообновление статуса каждые 5 секунд если идет авторизация
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const needsUpdate = (sessions.telegram?.needsAuth || sessions.whatsapp?.needsAuth);
    if (needsUpdate) {
      interval = setInterval(() => {
        updateSessionStatuses();
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessions.telegram?.needsAuth, sessions.whatsapp?.needsAuth]);

  // Загрузка истории сообщений при монтировании
  useEffect(() => {
    loadMessageHistory();
  }, [requestId]);

  const updateSessionStatuses = async () => {
    if (sessions.telegram?.sessionId) {
      try {
        const response = await messengerSessionsAPI.getSessionStatus(sessions.telegram.sessionId, 'TELEGRAM');
        if (response.success && response.data) {
          setSessions(prev => ({
            ...prev,
            telegram: {
              ...prev.telegram!,
              status: response.data!.status,
              isConnected: response.data!.isConnected,
              userInfo: response.data!.userInfo,
              needsAuth: !response.data!.isConnected
            }
          }));
        }
      } catch (error) {
        console.error('Error updating Telegram status:', error);
      }
    }

    if (sessions.whatsapp?.sessionId) {
      try {
        const response = await messengerSessionsAPI.getSessionStatus(sessions.whatsapp.sessionId, 'WHATSAPP');
        if (response.success && response.data) {
          setSessions(prev => ({
            ...prev,
            whatsapp: {
              ...prev.whatsapp!,
              status: response.data!.status,
              isConnected: response.data!.isConnected,
              userInfo: response.data!.userInfo,
              needsAuth: !response.data!.isConnected
            }
          }));
        }
      } catch (error) {
        console.error('Error updating WhatsApp status:', error);
      }
    }
  };

  const launchMessenger = async (platform: 'TELEGRAM' | 'WHATSAPP') => {
    const platformKey = platform.toLowerCase() as 'telegram' | 'whatsapp';
    
    setLoading(prev => ({...prev, [platformKey]: true}));
    
    try {
      const response = await messengerSessionsAPI.launchMessengerSession({
        requestId,
        companyId,
        platform
      });

      if (response.success && response.data) {
        setSessions(prev => ({
          ...prev,
          [platformKey]: {
            sessionId: response.data!.sessionId,
            status: response.data!.status,
            isConnected: !response.data!.needsAuth,
            webUrl: response.data!.webUrl,
            needsAuth: response.data!.needsAuth || false,
            qrCode: response.data!.qrCode,
            expiresAt: response.data!.expiresAt
          }
        }));

        // Если нужна авторизация, показываем QR
        if (response.data.needsAuth) {
          setShowQR(prev => ({...prev, [platformKey]: true}));
        } else {
          // Если уже подключен, можно сразу открыть веб-интерфейс
          if (response.data.webUrl) {
            window.open(response.data.webUrl, '_blank', 'width=1200,height=800');
          }
        }
      } else {
        alert(`Ошибка запуска ${platform}: ${response.error}`);
      }
    } catch (error) {
      console.error(`Error launching ${platform}:`, error);
      alert(`Ошибка запуска ${platform}`);
    } finally {
      setLoading(prev => ({...prev, [platformKey]: false}));
    }
  };

  const openWebInterface = (platform: 'telegram' | 'whatsapp') => {
    const session = sessions[platform];
    if (session && session.webUrl && session.isConnected) {
      window.open(session.webUrl, '_blank', 'width=1200,height=800');
    }
  };

  const disconnectSession = async (platform: 'TELEGRAM' | 'WHATSAPP') => {
    const platformKey = platform.toLowerCase() as 'telegram' | 'whatsapp';
    const session = sessions[platformKey];
    
    if (!session?.sessionId) return;
    
    if (!window.confirm(`Отключить ${platform} интеграцию?`)) return;
    
    try {
      await messengerSessionsAPI.disconnectSession(session.sessionId, platform);
      setSessions(prev => ({
        ...prev,
        [platformKey]: undefined
      }));
      setShowQR(prev => ({...prev, [platformKey]: false}));
    } catch (error) {
      alert(`Ошибка отключения ${platform}`);
    }
  };

  const loadMessageHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await messengerSessionsAPI.getRequestMessageHistory(requestId);
      if (response.success && response.data) {
        setMessageHistory(response.data);
        if (onMessagesUpdate) {
          onMessagesUpdate(response.data.messages.length);
        }
      }
    } catch (error) {
      console.error('Error loading message history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusIcon = (platform: 'telegram' | 'whatsapp') => {
    const session = sessions[platform];
    if (!session) return <MessageSquare className="h-5 w-5 text-gray-400" />;
    
    if (session.isConnected) return <CheckCircle className="h-5 w-5 text-green-400" />;
    if (session.needsAuth) return <QrCode className="h-5 w-5 text-yellow-400" />;
    return <AlertCircle className="h-5 w-5 text-red-400" />;
  };

  const getStatusText = (platform: 'telegram' | 'whatsapp') => {
    const session = sessions[platform];
    if (!session) return 'Не подключен';
    
    if (session.isConnected && session.userInfo) {
      return `Подключен: ${session.userInfo.name}${session.userInfo.username ? ` (@${session.userInfo.username})` : ''}${session.userInfo.phone ? ` (${session.userInfo.phone})` : ''}`;
    }
    
    if (session.needsAuth) return 'Требуется авторизация';
    return session.status;
  };

  return (
    <div className="space-y-4">
      {/* Заголовок с компанией */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <MessageCircle className="h-5 w-5 mr-2" />
          Мессенджеры компании: {companyName}
        </h3>
        <button
          onClick={() => setShowHistory(!showHistory)}
          disabled={historyLoading}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md flex items-center"
        >
          {historyLoading ? (
            <Loader className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <History className="h-4 w-4 mr-1" />
          )}
          История ({messageHistory?.messages.length || 0})
        </button>
      </div>

      {/* Telegram */}
      <Card>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon('telegram')}
            <div>
              <h4 className="font-semibold text-white flex items-center">
                <MessageSquare className="h-4 w-4 mr-1" />
                Telegram
              </h4>
              <p className="text-sm text-gray-400">
                {getStatusText('telegram')}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {!sessions.telegram?.isConnected ? (
              <button
                onClick={() => launchMessenger('TELEGRAM')}
                disabled={loading.telegram}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-md flex items-center"
              >
                {loading.telegram ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Запустить
              </button>
            ) : (
              <>
                <button
                  onClick={() => openWebInterface('telegram')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Открыть
                </button>
                <button
                  onClick={() => disconnectSession('TELEGRAM')}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md"
                >
                  Отключить
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* QR код для Telegram */}
        {showQR.telegram && sessions.telegram?.qrCode && (
          <div className="border-t p-4 text-center">
            <div className="inline-block p-3 bg-white rounded-lg mb-3">
              <img 
                src={sessions.telegram.qrCode} 
                alt="Telegram QR Code" 
                className="max-w-[180px] max-h-[180px]"
              />
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <p>📱 Отсканируйте QR код в Telegram</p>
              {sessions.telegram.expiresAt && (
                <p className="text-yellow-400 text-xs">
                  ⏰ Истекает: {new Date(sessions.telegram.expiresAt).toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowQR(prev => ({...prev, telegram: false}))}
              className="mt-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md"
            >
              Скрыть
            </button>
          </div>
        )}
      </Card>

      {/* WhatsApp */}
      <Card>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon('whatsapp')}
            <div>
              <h4 className="font-semibold text-white flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                WhatsApp
              </h4>
              <p className="text-sm text-gray-400">
                {getStatusText('whatsapp')}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {!sessions.whatsapp?.isConnected ? (
              <button
                onClick={() => launchMessenger('WHATSAPP')}
                disabled={loading.whatsapp}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-md flex items-center"
              >
                {loading.whatsapp ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4 mr-2" />
                )}
                Запустить
              </button>
            ) : (
              <>
                <button
                  onClick={() => openWebInterface('whatsapp')}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Открыть
                </button>
                <button
                  onClick={() => disconnectSession('WHATSAPP')}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md"
                >
                  Отключить
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* QR код для WhatsApp */}
        {showQR.whatsapp && sessions.whatsapp?.qrCode && (
          <div className="border-t p-4 text-center">
            <div className="inline-block p-3 bg-white rounded-lg mb-3">
              <img 
                src={sessions.whatsapp.qrCode} 
                alt="WhatsApp QR Code" 
                className="max-w-[180px] max-h-[180px]"
              />
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <p>📱 Отсканируйте QR код в WhatsApp</p>
              <p className="text-xs">Меню (⋮) → Привязанные устройства → Привязать устройство</p>
              {sessions.whatsapp.expiresAt && (
                <p className="text-yellow-400 text-xs">
                  ⏰ Истекает: {new Date(sessions.whatsapp.expiresAt).toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowQR(prev => ({...prev, whatsapp: false}))}
              className="mt-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md"
            >
              Скрыть
            </button>
          </div>
        )}
      </Card>

      {/* История сообщений */}
      {showHistory && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-white flex items-center">
                <History className="h-4 w-4 mr-2" />
                История переписок
              </h4>
              <button
                onClick={loadMessageHistory}
                disabled={historyLoading}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md"
              >
                {historyLoading ? 'Загрузка...' : 'Обновить'}
              </button>
            </div>
            
            {messageHistory && messageHistory.messages.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messageHistory.messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`p-3 rounded-md ${msg.direction === 'OUTGOING' ? 'bg-blue-900/30 ml-8' : 'bg-gray-800/50 mr-8'}`}
                  >
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span className="flex items-center">
                        {msg.platform === 'WHATSAPP' ? <Phone className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                        {msg.direction === 'OUTGOING' ? `${msg.fromName} → ${msg.toName}` : `${msg.fromName} → ${msg.toName}`}
                      </span>
                      <span>{new Date(msg.sentAt).toLocaleString()}</span>
                    </div>
                    <p className="text-white text-sm">{msg.body}</p>
                    {msg.hasAttachments && (
                      <p className="text-xs text-gray-400 mt-1">📎 Есть вложения</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                {historyLoading ? 'Загрузка сообщений...' : 'Переписок пока нет'}
              </p>
            )}
            
            {messageHistory && messageHistory.pagination.total > messageHistory.messages.length && (
              <div className="mt-4 text-center">
                <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md">
                  Загрузить ещё ({messageHistory.pagination.total - messageHistory.messages.length} сообщений)
                </button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MessengerManager;
