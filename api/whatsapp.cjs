const express = require('express');
const whatsappSessionManager = require('../services/whatsapp-session-manager.cjs');
const router = express.Router();

// Инициализация WhatsApp клиента
router.post('/initialize/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { clientId } = req.body; // Получаем ID клиента из тела запроса
    
    console.log(`🚀 API: Инициализация WhatsApp для компании ${companyId} (клиент: ${clientId})`);
    
    const result = await whatsappSessionManager.initializeSession(companyId, clientId || 'unknown');
    
    res.json(result);
  } catch (error) {
    console.error('❌ Ошибка API инициализации:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Получить QR код для авторизации
router.get('/qr/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const result = whatsappSessionManager.getQRCode(companyId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('❌ Ошибка получения QR кода:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Проверить статус клиента
router.get('/status/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const result = await whatsappSessionManager.getSessionStatus(companyId);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Ошибка получения статуса:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Инициирование нового чата (первое сообщение)
router.post('/initiate/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }
    
    console.log(`🚀 API: Инициирование чата из ${companyId} с ${phoneNumber}`);
    
    const result = await whatsappSessionManager.initiateChat(companyId, phoneNumber, message);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Ошибка инициирования чата:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Отправить сообщение в уже активный чат
router.post('/send/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }
    
    console.log(`📤 API: Отправка сообщения из ${companyId} на ${phoneNumber}`);
    
    const result = await whatsappSessionManager.sendMessage(companyId, phoneNumber, message);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Получить активные чаты (инициированные агентом)
router.get('/active-chats/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const activeChats = whatsappSessionManager.getActiveChats(companyId);
    
    res.json({
      success: true,
      chats: activeChats,
      count: activeChats.length
    });
  } catch (error) {
    console.error('❌ Ошибка получения активных чатов:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Добавить поставщика
router.post('/suppliers', async (req, res) => {
  try {
    const { phoneNumber, name, inn, contactPerson, email, id } = req.body;
    
    if (!phoneNumber || !name) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and name are required'
      });
    }
    
    whatsappSessionManager.addSupplier(phoneNumber, {
      id: id || `supplier_${Date.now()}`,
      name,
      inn,
      contactPerson,
      email
    });
    
    res.json({ success: true, message: 'Supplier added' });
  } catch (error) {
    console.error('❌ Ошибка добавления поставщика:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Загрузить поставщиков из базы
router.post('/suppliers/load', async (req, res) => {
  try {
    const { suppliers } = req.body;
    
    if (!Array.isArray(suppliers)) {
      return res.status(400).json({
        success: false,
        error: 'Suppliers must be an array'
      });
    }
    
    await whatsappSessionManager.loadSuppliers(suppliers);
    
    res.json({ 
      success: true, 
      message: `Loaded ${suppliers.length} suppliers` 
    });
  } catch (error) {
    console.error('❌ Ошибка загрузки поставщиков:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Установить обработчик сообщений
router.post('/message-handler/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { webhookUrl } = req.body;
    
    // Устанавливаем webhook обработчик
    whatsappSessionManager.setMessageHandler(companyId, async (messageData) => {
      try {
        // Отправляем webhook на сервер клиента
        if (webhookUrl) {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'whatsapp_message',
              data: messageData
            })
          });
          
          console.log(`🔗 Webhook отправлен для ${companyId}: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка webhook для ${companyId}:`, error);
      }
    });
    
    res.json({ success: true, message: 'Message handler set' });
  } catch (error) {
    console.error('❌ Ошибка установки обработчика:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Отключить клиент
router.delete('/disconnect/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    console.log(`🗑️ API: Отключение WhatsApp для компании ${companyId}`);
    
    const result = await whatsappSessionManager.destroySession(companyId);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Ошибка отключения:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Получить статистику всех сессий
router.get('/stats', async (req, res) => {
  try {
    const stats = whatsappSessionManager.getAllSessionsStatus();
    
    res.json({
      success: true,
      stats,
      totalSessions: Object.keys(stats).length,
      activeSessions: Object.values(stats).filter(s => s.connected).length
    });
  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Очистка неактивных сессий
router.post('/cleanup', async (req, res) => {
  try {
    const { maxInactiveHours = 24 } = req.body;
    
    await whatsappSessionManager.cleanupInactiveSessions(maxInactiveHours);
    
    res.json({ 
      success: true, 
      message: `Cleanup completed for sessions inactive more than ${maxInactiveHours} hours` 
    });
  } catch (error) {
    console.error('❌ Ошибка очистки:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
