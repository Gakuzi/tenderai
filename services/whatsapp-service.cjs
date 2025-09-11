const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
  constructor() {
    this.clients = new Map(); // Хранение клиентов по companyId
    this.qrCodes = new Map(); // Хранение QR кодов
  }

  // Инициализация клиента для компании
  async initializeClient(companyId) {
    console.log(`🚀 Инициализация WhatsApp клиента для компании: ${companyId}`);
    
    // Если клиент уже существует и подключен, используем его
    if (this.clients.has(companyId)) {
      const client = this.clients.get(companyId);
      const state = await client.getState();
      
      if (state === 'CONNECTED') {
        console.log(`✅ Клиент для ${companyId} уже подключен`);
        return { 
          success: true, 
          status: 'connected', 
          message: 'Client already connected' 
        };
      }
    }

    // Создаем новый клиент
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
        headless: 'new', // ВАЖНО: используем новый headless режим
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
          '--disable-extensions',
          '--no-default-browser-check',
          '--disable-plugins',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        // Убеждаемся что никаких окон не открывается
        devtools: false,
        defaultViewport: { width: 1280, height: 720 }
      }
    });

    // Настройка обработчиков событий
    this.setupClientEvents(client, companyId);
    
    // Сохраняем клиент
    this.clients.set(companyId, client);
    
    // Запускаем клиент
    try {
      await client.initialize();
      return { 
        success: true, 
        status: 'initializing', 
        message: 'Client initialization started' 
      };
    } catch (error) {
      console.error(`❌ Ошибка инициализации клиента ${companyId}:`, error);
      this.clients.delete(companyId);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Настройка обработчиков событий
  setupClientEvents(client, companyId) {
    // QR код для авторизации
    client.on('qr', async (qr) => {
      console.log(`📱 QR код сгенерирован для ${companyId}`);
      
      try {
        // Генерируем QR код как Data URL
        const qrCodeDataURL = await QRCode.toDataURL(qr, {
          width: 256,
          margin: 2
        });
        
        // Сохраняем QR код
        this.qrCodes.set(companyId, {
          qrCode: qrCodeDataURL,
          timestamp: new Date(),
          expires: new Date(Date.now() + 5 * 60 * 1000) // 5 минут
        });
        
        console.log(`✅ QR код для ${companyId} готов`);
      } catch (error) {
        console.error(`❌ Ошибка генерации QR кода для ${companyId}:`, error);
      }
    });

    // Успешная авторизация
    client.on('authenticated', () => {
      console.log(`✅ WhatsApp авторизация успешна для ${companyId}`);
      // Удаляем QR код после успешной авторизации
      this.qrCodes.delete(companyId);
    });

    // Клиент готов
    client.on('ready', () => {
      console.log(`🎉 WhatsApp клиент готов для ${companyId}`);
      const info = client.info;
      console.log(`📱 Подключен: ${info.pushname} (${info.wid.user})`);
    });

    // Отключение
    client.on('disconnected', (reason) => {
      console.log(`❌ WhatsApp отключен для ${companyId}:`, reason);
      // НЕ удаляем клиент из Map - он может переподключиться
    });

    // Ошибки авторизации
    client.on('auth_failure', (message) => {
      console.error(`❌ Ошибка авторизации WhatsApp для ${companyId}:`, message);
      this.qrCodes.delete(companyId);
    });
  }

  // Получить QR код для авторизации
  getQRCode(companyId) {
    const qrData = this.qrCodes.get(companyId);
    
    if (!qrData) {
      return { success: false, message: 'QR code not found' };
    }
    
    // Проверяем срок действия
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

  // Проверить статус клиента
  async getClientStatus(companyId) {
    const client = this.clients.get(companyId);
    
    if (!client) {
      return {
        success: true,
        status: 'not_initialized',
        connected: false
      };
    }

    try {
      const state = await client.getState();
      const isConnected = state === 'CONNECTED';
      
      let info = null;
      if (isConnected) {
        try {
          info = client.info;
        } catch (e) {
          console.warn(`Не удалось получить info для ${companyId}`);
        }
      }
      
      return {
        success: true,
        status: state.toLowerCase(),
        connected: isConnected,
        info: info ? {
          pushname: info.pushname,
          phone: info.wid.user,
          platform: info.platform
        } : null
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

  // Отправить сообщение
  async sendMessage(companyId, phoneNumber, message) {
    const client = this.clients.get(companyId);
    
    if (!client) {
      return { 
        success: false, 
        error: 'Client not initialized' 
      };
    }

    try {
      const state = await client.getState();
      
      if (state !== 'CONNECTED') {
        return { 
          success: false, 
          error: `Client not connected. Status: ${state}` 
        };
      }

      // Форматируем номер
      let formattedNumber = phoneNumber.replace(/\D/g, '');
      if (!formattedNumber.endsWith('@c.us')) {
        formattedNumber += '@c.us';
      }

      console.log(`📤 Отправка сообщения из ${companyId} на ${phoneNumber}`);
      
      const result = await client.sendMessage(formattedNumber, message);
      
      console.log(`✅ Сообщение отправлено успешно из ${companyId}`);
      
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

  // Получить список чатов
  async getChats(companyId, limit = 20) {
    const client = this.clients.get(companyId);
    
    if (!client) {
      return { success: false, error: 'Client not initialized' };
    }

    try {
      const state = await client.getState();
      
      if (state !== 'CONNECTED') {
        return { success: false, error: `Client not connected. Status: ${state}` };
      }

      const chats = await client.getChats();
      const chatsList = [];

      for (const chat of chats.slice(0, limit)) {
        try {
          const lastMessage = await chat.fetchMessages({ limit: 1 });
          
          chatsList.push({
            id: chat.id._serialized,
            name: chat.name || chat.id.user || 'Без имени',
            isGroup: chat.isGroup,
            unreadCount: chat.unreadCount,
            lastMessage: lastMessage.length > 0 ? {
              body: lastMessage[0].body,
              timestamp: new Date(lastMessage[0].timestamp * 1000),
              fromMe: lastMessage[0].fromMe
            } : null,
            timestamp: chat.timestamp ? new Date(chat.timestamp * 1000) : null
          });
        } catch (error) {
          console.warn(`Ошибка получения данных чата ${chat.name}:`, error);
        }
      }

      return {
        success: true,
        chats: chatsList
      };
      
    } catch (error) {
      console.error(`❌ Ошибка получения чатов для ${companyId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Закрыть клиент
  async destroyClient(companyId) {
    const client = this.clients.get(companyId);
    
    if (client) {
      try {
        await client.destroy();
        console.log(`🗑️ Клиент ${companyId} уничтожен`);
      } catch (error) {
        console.error(`Ошибка уничтожения клиента ${companyId}:`, error);
      }
      
      this.clients.delete(companyId);
      this.qrCodes.delete(companyId);
    }
    
    return { success: true };
  }

  // Получить статистику всех клиентов
  async getAllClientsStatus() {
    const stats = {};
    
    for (const [companyId, client] of this.clients) {
      try {
        const state = await client.getState();
        stats[companyId] = {
          status: state.toLowerCase(),
          connected: state === 'CONNECTED',
          hasQR: this.qrCodes.has(companyId)
        };
      } catch (error) {
        stats[companyId] = {
          status: 'error',
          connected: false,
          hasQR: this.qrCodes.has(companyId),
          error: error.message
        };
      }
    }
    
    return stats;
  }
}

// Создаем singleton экземпляр
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
