// API роуты для Telegram интеграции
// Использует GramJS вместо Puppeteer для более стабильной работы

const express = require('express');
const router = express.Router();

// Импортируем менеджер (будет доступен после компиляции TypeScript)
let TelegramSessionManager;
try {
  const { TelegramSessionManager: TSM } = require('../dist/services/integrations/telegram-gramjs-manager.js');
  TelegramSessionManager = TSM;
} catch (error) {
  console.log('⚠️ Telegram GramJS manager not found, using fallback');
  TelegramSessionManager = {
    getManager: () => ({ 
      startAuth: () => ({ success: false, error: 'GramJS not available' }),
      completeAuth: () => ({ success: false, error: 'GramJS not available' }),
      restoreSession: () => false,
      sendMessage: () => ({ success: false, error: 'GramJS not available' }),
      getChats: () => [],
      isClientConnected: () => false,
      disconnect: () => {}
    })
  };
}

// Глобальное хранилище состояний авторизации
const authStates = new Map();

/**
 * POST /api/telegram/auth/start/:companyId
 * Начать процесс авторизации Telegram
 */
router.post('/auth/start/:companyId', async (req, res) => {
  const { companyId } = req.params;
  const { phoneNumber, integrationId } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required'
    });
  }

  try {
    console.log(`🚀 Starting Telegram auth for company ${companyId}`);

    const manager = await TelegramSessionManager.getManager(companyId);
    const result = await manager.startAuth(integrationId || `tg_${companyId}_${Date.now()}`, phoneNumber);

    if (result.success) {
      // Сохраняем состояние авторизации
      authStates.set(companyId, {
        phoneNumber,
        integrationId: integrationId || `tg_${companyId}_${Date.now()}`,
        timestamp: Date.now()
      });

      res.json({
        success: true,
        message: 'Код отправлен на ваш телефон',
        needsCode: result.needsCode,
        integrationId: integrationId || `tg_${companyId}_${Date.now()}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to start auth'
      });
    }
  } catch (error) {
    console.error('❌ Telegram auth start error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/telegram/auth/complete/:companyId
 * Завершить авторизацию с кодом из SMS
 */
router.post('/auth/complete/:companyId', async (req, res) => {
  const { companyId } = req.params;
  const { phoneCode, password } = req.body;

  if (!phoneCode) {
    return res.status(400).json({
      success: false,
      error: 'Phone code is required'
    });
  }

  try {
    const authState = authStates.get(companyId);
    if (!authState) {
      return res.status(400).json({
        success: false,
        error: 'No active auth session found. Please start auth first.'
      });
    }

    console.log(`🔐 Completing Telegram auth for company ${companyId}`);

    const manager = await TelegramSessionManager.getManager(companyId);
    const result = await manager.completeAuth({
      phoneNumber: authState.phoneNumber,
      phoneCode,
      password
    });

    if (result.success) {
      // Очищаем состояние авторизации
      authStates.delete(companyId);

      res.json({
        success: true,
        message: 'Успешно авторизован в Telegram',
        userInfo: result.userInfo,
        connected: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to complete auth'
      });
    }
  } catch (error) {
    console.error('❌ Telegram auth completion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/telegram/status/:companyId
 * Проверить статус подключения Telegram
 */
router.get('/status/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    const manager = await TelegramSessionManager.getManager(companyId);
    const isConnected = manager.isClientConnected();

    // Получаем информацию из базы данных
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const integration = await prisma.telegramIntegration.findFirst({
      where: { companyId },
      orderBy: { updatedAt: 'desc' }
    });

    if (!integration) {
      return res.json({
        success: true,
        status: 'not_initialized',
        connected: false,
        message: 'Telegram не инициализирован для этой компании'
      });
    }

    res.json({
      success: true,
      status: integration.connectionStatus || 'unknown',
      connected: isConnected && integration.status === 'CONNECTED',
      info: isConnected ? {
        displayName: integration.displayName,
        username: integration.sessionUsername,
        lastChecked: integration.lastCheckedAt
      } : null,
      error: integration.lastError
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Telegram status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Status check failed'
    });
  }
});

/**
 * GET /api/telegram/chats/:companyId
 * Получить список чатов
 */
router.get('/chats/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    const manager = await TelegramSessionManager.getManager(companyId);
    
    if (!manager.isClientConnected()) {
      return res.status(400).json({
        success: false,
        error: 'Telegram client not connected'
      });
    }

    const chats = await manager.getChats();

    res.json({
      success: true,
      chats,
      total: chats.length
    });
  } catch (error) {
    console.error('❌ Telegram get chats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get chats'
    });
  }
});

/**
 * POST /api/telegram/send/:companyId
 * Отправить сообщение в Telegram
 */
router.post('/send/:companyId', async (req, res) => {
  const { companyId } = req.params;
  const { chatId, message, replyToMessageId } = req.body;

  if (!chatId || !message) {
    return res.status(400).json({
      success: false,
      error: 'chatId and message are required'
    });
  }

  try {
    const manager = await TelegramSessionManager.getManager(companyId);
    
    if (!manager.isClientConnected()) {
      return res.status(400).json({
        success: false,
        error: 'Telegram client not connected'
      });
    }

    const result = await manager.sendMessage({
      chatId,
      message,
      replyToMessageId
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Сообщение отправлено',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send message'
      });
    }
  } catch (error) {
    console.error('❌ Telegram send message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Send failed'
    });
  }
});

/**
 * DELETE /api/telegram/disconnect/:companyId
 * Отключить Telegram клиент
 */
router.delete('/disconnect/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    const manager = await TelegramSessionManager.getManager(companyId);
    await manager.disconnect();

    res.json({
      success: true,
      message: 'Telegram отключен'
    });
  } catch (error) {
    console.error('❌ Telegram disconnect error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Disconnect failed'
    });
  }
});

/**
 * POST /api/telegram/restore/:companyId
 * Восстановить сессию из сохраненной строки
 */
router.post('/restore/:companyId', async (req, res) => {
  const { companyId } = req.params;
  const { integrationId, sessionString } = req.body;

  if (!integrationId || !sessionString) {
    return res.status(400).json({
      success: false,
      error: 'integrationId and sessionString are required'
    });
  }

  try {
    const manager = await TelegramSessionManager.getManager(companyId);
    const restored = await manager.restoreSession(integrationId, sessionString);

    if (restored) {
      res.json({
        success: true,
        message: 'Сессия восстановлена',
        connected: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to restore session'
      });
    }
  } catch (error) {
    console.error('❌ Telegram session restore error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Restore failed'
    });
  }
});

// Middleware для очистки старых состояний авторизации
setInterval(() => {
  const now = Date.now();
  const TIMEOUT = 10 * 60 * 1000; // 10 минут

  for (const [companyId, authState] of authStates.entries()) {
    if (now - authState.timestamp > TIMEOUT) {
      console.log(`🧹 Cleaning up expired auth state for company ${companyId}`);
      authStates.delete(companyId);
    }
  }
}, 5 * 60 * 1000); // Проверяем каждые 5 минут

module.exports = router;
