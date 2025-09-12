#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { WhatsAppWebManager } from './services/integrations/whatsapp-web-manager';
import { IntegrationManager } from './services/integrations/integration-manager';

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

// Глобальный менеджер интеграций  
const integrationManager = new IntegrationManager();
const managers = new Map<string, WhatsAppWebManager>();

// Получить менеджер для компании
function getWhatsAppManager(companyId: string): WhatsAppWebManager {
  if (!managers.has(companyId)) {
    managers.set(companyId, new WhatsAppWebManager(companyId));
  }
  return managers.get(companyId)!;
}

// GET /api/whatsapp/status/:companyId - проверка статуса
app.get('/api/whatsapp/status/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Тут должна быть проверка через базу данных
    // Пока возвращаем базовый статус
    res.json({
      success: true,
      status: 'not_initialized',
      connected: false,
      info: null
    });
  } catch (error) {
    console.error('WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/whatsapp/initialize/:companyId - инициализация
app.post('/api/whatsapp/initialize/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const manager = getWhatsAppManager(companyId);
    
    // TODO: Создать интеграцию в БД и получить ID
    const integrationId = `wa_${companyId}_${Date.now()}`;
    
    console.log(`Initializing WhatsApp for company ${companyId}, integration ${integrationId}`);
    
    res.json({
      success: true,
      integrationId,
      message: 'WhatsApp initialization started'
    });
  } catch (error) {
    console.error('WhatsApp initialization error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Initialization failed'
    });
  }
});

// GET /api/whatsapp/qr/:companyId - получить QR код
app.get('/api/whatsapp/qr/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const manager = getWhatsAppManager(companyId);
    
    // TODO: Получить реальный integrationId из БД
    const integrationId = `wa_${companyId}_temp`;
    
    console.log(`Generating QR code for company ${companyId}`);
    
    const qrCode = await manager.generateQRCode(integrationId);
    
    res.json({
      success: true,
      qrCode,
      expires: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('WhatsApp QR generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'QR generation failed'
    });
  }
});

// POST /api/whatsapp/send/:companyId - отправка сообщения
app.post('/api/whatsapp/send/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber and message are required'
      });
    }
    
    const manager = getWhatsAppManager(companyId);
    
    // TODO: Реализовать отправку через manager
    console.log(`Sending WhatsApp message to ${phoneNumber} from company ${companyId}: ${message}`);
    
    res.json({
      success: true,
      messageId: `msg_${Date.now()}`,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Send failed'
    });
  }
});

// DELETE /api/whatsapp/disconnect/:companyId - отключение
app.delete('/api/whatsapp/disconnect/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const manager = getWhatsAppManager(companyId);
    
    // TODO: Реализовать отключение через manager
    managers.delete(companyId);
    
    console.log(`Disconnected WhatsApp for company ${companyId}`);
    
    res.json({
      success: true,
      message: 'WhatsApp disconnected'
    });
  } catch (error) {
    console.error('WhatsApp disconnect error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Disconnect failed'
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 WhatsApp Dev API server running on http://localhost:${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`  GET    /api/whatsapp/status/:companyId`);
  console.log(`  POST   /api/whatsapp/initialize/:companyId`);
  console.log(`  GET    /api/whatsapp/qr/:companyId`);
  console.log(`  POST   /api/whatsapp/send/:companyId`);
  console.log(`  DELETE /api/whatsapp/disconnect/:companyId`);
});