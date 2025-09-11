const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Импортируем логгер коммуникаций
let CommunicationLogger;
try {
  const loggerModule = require('./communication-logger.cjs');
  CommunicationLogger = loggerModule.CommunicationLogger;
  console.log('✅ Communication logger loaded');
} catch (e) {
  console.log('⚠️ Communication logger not available, logging disabled:', e.message);
}

/**
 * Менеджер множественных WhatsApp сессий
 * Управляет сессиями для разных компаний клиентов
 */
class WhatsAppSessionManager {
  constructor() {
    this.sessions = new Map(); // companyId -> SessionData
    this.qrCodes = new Map();  // companyId -> QRCodeData
    this.activeChats = new Map(); // companyId -> Set<chatId> - инициированные агентом чаты
    this.suppliers = new Map(); // phoneNumber -> supplierInfo - база поставщиков
    this.messageHandlers = new Map(); // companyId -> handler function
  }

  /**
   * Инициализация сессии для компании
   */
  async initializeSession(companyId, clientId) {
    console.log(`🚀 Инициализация WhatsApp сессии для компании: ${companyId} (клиент: ${clientId})`);
    
    // Если сессия уже существует и подключена
    if (this.sessions.has(companyId)) {
      const session = this.sessions.get(companyId);
      if (session.client && await this.isClientConnected(session.client)) {
        console.log(`✅ Сессия для ${companyId} уже активна`);
        return { success: true, status: 'connected', message: 'Session already active' };
      }
    }

    // Создаем новую сессию
    const sessionData = await this.createSession(companyId, clientId);
    this.sessions.set(companyId, sessionData);
    
    try {
      await sessionData.client.initialize();
      return { success: true, status: 'initializing', message: 'Session initialization started' };
    } catch (error) {
      console.error(`❌ Ошибка инициализации сессии ${companyId}:`, error);
      this.sessions.delete(companyId);
      return { success: false, error: error.message };
    }
  }

  /**
   * Создание новой сессии
   */
  async createSession(companyId, clientId) {
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session_${companyId}`);
    
    // Создаем директорию если не существует
    if (!fs.existsSync(path.dirname(sessionPath))) {
      fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: companyId,
        dataPath: sessionPath
      }),
      puppeteer: {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions'
        ],
        devtools: false,
        defaultViewport: { width: 1280, height: 720 }
      }
    });

    const sessionData = {
      companyId,
      clientId,
      client,
      status: 'initializing',
      connectedAt: null,
      lastActivity: new Date(),
      info: null
    };

    // Настройка обработчиков событий для этой сессии
    this.setupSessionEvents(sessionData);
    
    return sessionData;
  }

  /**
   * Настройка обработчиков событий для сессии
   */
  setupSessionEvents(sessionData) {
    const { companyId, client } = sessionData;

    // QR код для авторизации
    client.on('qr', async (qr) => {
      console.log(`📱 QR код сгенерирован для компании ${companyId}`);
      
      try {
        const qrCodeDataURL = await QRCode.toDataURL(qr, {
          width: 256,
          margin: 2
        });
        
        this.qrCodes.set(companyId, {
          qrCode: qrCodeDataURL,
          timestamp: new Date(),
          expires: new Date(Date.now() + 5 * 60 * 1000)
        });
        
        console.log(`✅ QR код для ${companyId} готов`);
      } catch (error) {
        console.error(`❌ Ошибка генерации QR кода для ${companyId}:`, error);
      }
    });

    // Успешная авторизация
    client.on('authenticated', () => {
      console.log(`✅ WhatsApp авторизация успешна для ${companyId}`);
      this.qrCodes.delete(companyId);
      sessionData.status = 'authenticated';
    });

    // Клиент готов
    client.on('ready', () => {
      console.log(`🎉 WhatsApp клиент готов для ${companyId}`);
      const info = client.info;
      console.log(`📱 Подключен: ${info.pushname} (${info.wid.user})`);
      
      sessionData.status = 'connected';
      sessionData.connectedAt = new Date();
      sessionData.info = {
        pushname: info.pushname,
        phone: info.wid.user,
        platform: info.platform
      };

      // Инициализируем набор активных чатов для этой компании
      if (!this.activeChats.has(companyId)) {
        this.activeChats.set(companyId, new Set());
      }
    });

    // Обработка входящих сообщений
    client.on('message', async (message) => {
      await this.handleIncomingMessage(companyId, message);
    });

    // Отключение
    client.on('disconnected', (reason) => {
      console.log(`❌ WhatsApp отключен для ${companyId}:`, reason);
      sessionData.status = 'disconnected';
    });

    // Ошибки авторизации
    client.on('auth_failure', (message) => {
      console.error(`❌ Ошибка авторизации WhatsApp для ${companyId}:`, message);
      sessionData.status = 'auth_failure';
      this.qrCodes.delete(companyId);
    });
  }

  /**
   * Умная обработка входящих сообщений
   */
  async handleIncomingMessage(companyId, message) {
    try {
      const chatId = message.from;
      const isFromMe = message.fromMe;
      
      // Игнорируем свои собственные сообщения
      if (isFromMe) return;
      
      // Проверяем, должны ли мы реагировать на это сообщение
      const shouldReact = await this.shouldReactToMessage(companyId, chatId, message);
      
      // Логируем входящее сообщение
      if (CommunicationLogger && shouldReact) {
        const phoneNumber = this.extractPhoneFromChatId(chatId);
        const supplierId = phoneNumber ? CommunicationLogger.findSupplierByPhone(phoneNumber) : null;
        const clientRequestId = CommunicationLogger.getActiveRequestForCompany(companyId);
        
        await CommunicationLogger.logWhatsAppMessage({
          messageId: message.id._serialized,
          direction: 'INCOMING',
          body: message.body || '',
          fromContact: chatId,
          toContact: companyId,
          fromName: message._data.notifyName || null,
          companyId,
          supplierId,
          clientRequestId,
          hasAttachments: message.hasMedia,
          sentAt: new Date(message.timestamp * 1000),
          initiatedByAgent: false
        });
      }
      
      if (shouldReact) {
        console.log(`📨 Обрабатываем сообщение в чате ${chatId} для компании ${companyId}`);
        
        // Обновляем активность сессии
        const session = this.sessions.get(companyId);
        if (session) {
          session.lastActivity = new Date();
        }
        
        // Вызываем пользовательский обработчик если он есть
        const handler = this.messageHandlers.get(companyId);
        if (handler) {
          await handler({
            companyId,
            chatId,
            message: {
              id: message.id._serialized,
              body: message.body,
              timestamp: new Date(message.timestamp * 1000),
              from: message.from,
              to: message.to,
              type: message.type,
              hasMedia: message.hasMedia
            }
          });
        }
      } else {
        console.log(`🔇 Игнорируем сообщение в чате ${chatId} для компании ${companyId} (не инициирован агентом)`);
      }
    } catch (error) {
      console.error(`❌ Ошибка обработки сообщения для ${companyId}:`, error);
    }
  }

  /**
   * Определяет, должны ли мы реагировать на сообщение
   */
  async shouldReactToMessage(companyId, chatId, message) {
    // 1. Проверяем, инициировал ли агент этот чат
    const activeChats = this.activeChats.get(companyId);
    if (activeChats && activeChats.has(chatId)) {
      return true;
    }

    // 2. Проверяем, является ли отправитель известным поставщиком
    const phoneNumber = this.extractPhoneFromChatId(chatId);
    if (phoneNumber && this.suppliers.has(phoneNumber)) {
      // Автоматически добавляем чат в активные если это поставщик
      if (activeChats) {
        activeChats.add(chatId);
        console.log(`📞 Добавляем чат поставщика ${phoneNumber} в активные для ${companyId}`);
      }
      return true;
    }

    // 3. Дополнительная логика - можно добавить проверку по ключевым словам,
    // предыдущей переписке и т.д.
    
    return false;
  }

  /**
   * Извлекает номер телефона из chatId
   */
  extractPhoneFromChatId(chatId) {
    // chatId обычно в формате "79214962555@c.us" или "79214962555-1234567890@g.us" для групп
    if (chatId.includes('@c.us')) {
      return chatId.split('@')[0];
    }
    return null;
  }

  /**
   * Инициирование чата агентом (отправка первого сообщения)
   */
  async initiateChat(companyId, phoneNumber, message) {
    const session = this.sessions.get(companyId);
    if (!session || !session.client) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status !== 'connected') {
      return { success: false, error: 'Session not connected' };
    }

    try {
      // Форматируем номер
      let formattedNumber = phoneNumber.replace(/\D/g, '');
      if (!formattedNumber.endsWith('@c.us')) {
        formattedNumber += '@c.us';
      }

      console.log(`📤 Инициируем чат из ${companyId} с ${phoneNumber}`);
      
      // Отправляем сообщение
      const result = await session.client.sendMessage(formattedNumber, message);
      
      // Логируем исходящее сообщение
      if (CommunicationLogger) {
        const supplierId = CommunicationLogger.findSupplierByPhone(phoneNumber);
        const clientRequestId = CommunicationLogger.getActiveRequestForCompany(companyId);
        
        await CommunicationLogger.logWhatsAppMessage({
          messageId: result.id._serialized,
          direction: 'OUTGOING',
          body: message,
          fromContact: companyId,
          toContact: formattedNumber,
          companyId,
          supplierId,
          clientRequestId,
          hasAttachments: false,
          sentAt: new Date(),
          initiatedByAgent: true
        });
      }
      
      // Добавляем чат в активные (инициированные агентом)
      const activeChats = this.activeChats.get(companyId);
      if (activeChats) {
        activeChats.add(formattedNumber);
        console.log(`✅ Чат ${phoneNumber} добавлен в активные для ${companyId}`);
      }
      
      // Обновляем активность сессии
      session.lastActivity = new Date();
      
      console.log(`✅ Сообщение отправлено и чат инициирован из ${companyId}`);
      
      return {
        success: true,
        messageId: result.id._serialized,
        timestamp: new Date(),
        chatInitiated: true
      };
      
    } catch (error) {
      console.error(`❌ Ошибка инициирования чата из ${companyId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Отправка сообщения в уже инициированный чат
   */
  async sendMessage(companyId, phoneNumber, message) {
    const session = this.sessions.get(companyId);
    if (!session || !session.client) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status !== 'connected') {
      return { success: false, error: 'Session not connected' };
    }

    // Проверяем, активен ли чат
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    if (!formattedNumber.endsWith('@c.us')) {
      formattedNumber += '@c.us';
    }

    const activeChats = this.activeChats.get(companyId);
    if (!activeChats || !activeChats.has(formattedNumber)) {
      return { 
        success: false, 
        error: 'Chat not initiated by agent. Use initiateChat() first.' 
      };
    }

    try {
      console.log(`📤 Отправка сообщения из ${companyId} в активный чат ${phoneNumber}`);
      
      const result = await session.client.sendMessage(formattedNumber, message);
      
      // Логируем сообщение в активный чат
      if (CommunicationLogger) {
        const supplierId = CommunicationLogger.findSupplierByPhone(phoneNumber);
        const clientRequestId = CommunicationLogger.getActiveRequestForCompany(companyId);
        
        await CommunicationLogger.logWhatsAppMessage({
          messageId: result.id._serialized,
          direction: 'OUTGOING',
          body: message,
          fromContact: companyId,
          toContact: formattedNumber,
          companyId,
          supplierId,
          clientRequestId,
          hasAttachments: false,
          sentAt: new Date(),
          initiatedByAgent: false // не инициируем, а продолжаем
        });
      }
      
      // Обновляем активность сессии
      session.lastActivity = new Date();
      
      console.log(`✅ Сообщение отправлено в активный чат из ${companyId}`);
      
      return {
        success: true,
        messageId: result.id._serialized,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error(`❌ Ошибка отправки сообщения из ${companyId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Добавление поставщика в базу
   */
  addSupplier(phoneNumber, supplierInfo) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    this.suppliers.set(cleanPhone, {
      ...supplierInfo,
      addedAt: new Date()
    });
    console.log(`👥 Добавлен поставщик: ${cleanPhone} - ${supplierInfo.name}`);
  }

  /**
   * Удаление поставщика из базы
   */
  removeSupplier(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const removed = this.suppliers.delete(cleanPhone);
    if (removed) {
      console.log(`👥 Удален поставщик: ${cleanPhone}`);
    }
    return removed;
  }

  /**
   * Загрузка поставщиков из внешнего источника (например, базы данных)
   */
  async loadSuppliers(suppliersData) {
    for (const supplier of suppliersData) {
      if (supplier.phone) {
        this.addSupplier(supplier.phone, {
          id: supplier.id,
          name: supplier.name,
          inn: supplier.inn,
          contactPerson: supplier.contactPerson,
          email: supplier.email
        });
      }
    }
    console.log(`👥 Загружено ${suppliersData.length} поставщиков`);
  }

  /**
   * Установка обработчика сообщений для компании
   */
  setMessageHandler(companyId, handler) {
    this.messageHandlers.set(companyId, handler);
    console.log(`🔧 Установлен обработчик сообщений для ${companyId}`);
  }

  /**
   * Получение статуса сессии
   */
  async getSessionStatus(companyId) {
    const session = this.sessions.get(companyId);
    
    if (!session) {
      return {
        success: true,
        status: 'not_initialized',
        connected: false
      };
    }

    try {
      const isConnected = await this.isClientConnected(session.client);
      
      return {
        success: true,
        status: session.status,
        connected: isConnected,
        info: session.info,
        connectedAt: session.connectedAt,
        lastActivity: session.lastActivity,
        activeChatsCount: this.activeChats.get(companyId)?.size || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'error',
        connected: false
      };
    }
  }

  /**
   * Получение QR кода
   */
  getQRCode(companyId) {
    const qrData = this.qrCodes.get(companyId);
    
    if (!qrData) {
      return { success: false, message: 'QR code not found' };
    }
    
    if (new Date() > qrData.expires) {
      this.qrCodes.delete(companyId);
      return { success: false, message: 'QR code expired' };
    }
    
    return {
      success: true,
      qrCode: qrData.qrCode,
      expires: qrData.expires
    };
  }

  /**
   * Получение активных чатов для компании
   */
  getActiveChats(companyId) {
    const activeChats = this.activeChats.get(companyId);
    return activeChats ? Array.from(activeChats) : [];
  }

  /**
   * Получение списка всех сессий
   */
  getAllSessionsStatus() {
    const stats = {};
    
    for (const [companyId, session] of this.sessions) {
      stats[companyId] = {
        status: session.status,
        connected: session.status === 'connected',
        hasQR: this.qrCodes.has(companyId),
        connectedAt: session.connectedAt,
        lastActivity: session.lastActivity,
        info: session.info,
        activeChatsCount: this.activeChats.get(companyId)?.size || 0
      };
    }
    
    return stats;
  }

  /**
   * Проверка подключения клиента
   */
  async isClientConnected(client) {
    if (!client) return false;
    
    try {
      const state = await client.getState();
      return state === 'CONNECTED';
    } catch (error) {
      return false;
    }
  }

  /**
   * Уничтожение сессии
   */
  async destroySession(companyId) {
    const session = this.sessions.get(companyId);
    
    if (session && session.client) {
      try {
        await session.client.destroy();
        console.log(`🗑️ Сессия ${companyId} уничтожена`);
      } catch (error) {
        console.error(`Ошибка уничтожения сессии ${companyId}:`, error);
      }
    }
    
    this.sessions.delete(companyId);
    this.qrCodes.delete(companyId);
    this.activeChats.delete(companyId);
    this.messageHandlers.delete(companyId);
    
    return { success: true };
  }

  /**
   * Очистка неактивных сессий (можно запускать периодически)
   */
  async cleanupInactiveSessions(maxInactiveHours = 24) {
    const now = new Date();
    const maxInactiveMs = maxInactiveHours * 60 * 60 * 1000;
    
    for (const [companyId, session] of this.sessions) {
      const inactiveTime = now - session.lastActivity;
      
      if (inactiveTime > maxInactiveMs && session.status !== 'connected') {
        console.log(`🧹 Очищаем неактивную сессию ${companyId} (неактивна ${Math.round(inactiveTime / (60 * 60 * 1000))} часов)`);
        await this.destroySession(companyId);
      }
    }
  }
}

// Создаем singleton экземпляр
const whatsappSessionManager = new WhatsAppSessionManager();

module.exports = whatsappSessionManager;
