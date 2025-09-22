import express from 'express';
import cors from 'cors';
import path from 'path';
import whatsappRoutes from './api/whatsapp.ts';
import { integrationManager } from './services/integrations/integration-manager.ts';
import { prisma } from './lib/prisma.ts';
import { IntegrationType } from '@prisma/client';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api/integrations/whatsapp', whatsappRoutes);

// Generic message sending endpoint
app.post('/api/message', async (req, res) => {
  const { companyId, integrationType, recipient, message } = req.body;

  if (!companyId || !integrationType || !recipient || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const manager = integrationManager.getInstance(companyId);

    // Find the active integration ID
    let integration;
    if (integrationType === IntegrationType.WHATSAPP) {
        integration = await prisma.whatsAppIntegration.findFirst({
            where: { companyId, status: 'CONNECTED' },
            orderBy: { createdAt: 'desc' }
        });
    } else if (integrationType === IntegrationType.TELEGRAM) {
        integration = await prisma.telegramIntegration.findFirst({
            where: { companyId, status: 'CONNECTED' },
            orderBy: { createdAt: 'desc' }
        });
    }

    if (!integration) {
        return res.status(404).json({ success: false, error: 'Active integration not found' });
    }

    const result = await manager.sendMessage(integration.id, integrationType, recipient, message);
    res.json(result);
  } catch (error) {
    console.error(`Error sending message via ${integrationType}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Простая страница для тестирования
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>TenderAI WhatsApp Server</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            button { padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; }
            .btn-primary { background: #007bff; color: white; }
            .btn-success { background: #28a745; color: white; }
            .btn-danger { background: #dc3545; color: white; }
            input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin: 5px; }
            .logs { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; height: 200px; overflow-y: auto; white-space: pre-wrap; }
            .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
            .status.connected { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .status.error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .status.disconnected { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
            #qrcode { text-align: center; margin: 20px 0; }
            #qrcode img { border: 2px solid #25d366; border-radius: 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 TenderAI WhatsApp Server</h1>
                <p>Управление WhatsApp интеграциями с headless режимом</p>
            </div>
            
            <div class="section">
                <h3>🚀 Инициализация клиента</h3>
                <input type="text" id="companyId" placeholder="Company ID" value="test-company-123">
                <button class="btn-primary" onclick="initializeClient()">Инициализировать WhatsApp</button>
                <button class="btn-success" onclick="checkStatus()">Проверить статус</button>
                <button class="btn-danger" onclick="disconnect()">Отключить</button>
                <div id="status" class="status disconnected">Статус: Не инициализирован</div>
            </div>
            
            <div class="section">
                <h3>📱 QR код для авторизации</h3>
                <button class="btn-success" onclick="getQRCode()">Получить QR код</button>
                <div id="qrcode"></div>
            </div>
            
            <div class="section">
                <h3>📤 Отправка сообщения</h3>
                <input type="text" id="phoneNumber" placeholder="Номер телефона" value="+79214962555">
                <input type="text" id="messageText" placeholder="Сообщение" value="Тест из TenderAI!">
                <button class="btn-success" onclick="sendMessage()">Отправить сообщение</button>
            </div>
            
            <div class="section">
                <h3>📂 Получить чаты</h3>
                <button class="btn-primary" onclick="getChats()">Получить список чатов</button>
            </div>
            
            <div class="section">
                <h3>📊 Статистика всех клиентов</h3>
                <button class="btn-primary" onclick="getAllStats()">Получить статистику</button>
            </div>
            
            <div class="section">
                <h3>📝 Логи</h3>
                <div id="logs" class="logs">Инициализация...\n</div>
                <button class="btn-primary" onclick="clearLogs()">Очистить логи</button>
            </div>
        </div>

        <script>
            let currentCompanyId = 'test-company-123';
            
            function log(message) {
                const logs = document.getElementById('logs');
                const timestamp = new Date().toLocaleTimeString();
                logs.textContent += timestamp + ' - ' + message + '\\n';
                logs.scrollTop = logs.scrollHeight;
            }
            
            function clearLogs() {
                document.getElementById('logs').textContent = '';
            }
            
            function updateCompanyId() {
                currentCompanyId = document.getElementById('companyId').value || 'test-company-123';
            }
            
            async function initializeClient() {
                updateCompanyId();
                log('🚀 Инициализация WhatsApp клиента для ' + currentCompanyId);
                
                try {
                    const response = await fetch('/api/integrations/whatsapp/connect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ companyId: currentCompanyId })
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        log('✅ ' + result.message);
                        setTimeout(checkStatus, 2000);
                        setTimeout(getQRCode, 3000);
                    } else {
                        log('❌ Ошибка: ' + result.error);
                    }
                } catch (error) {
                    log('❌ Сетевая ошибка: ' + error.message);
                }
            }
            
            async function checkStatus() {
                updateCompanyId();
                
                try {
                    const response = await fetch('/api/integrations/whatsapp/status?companyId=' + currentCompanyId);
                    const result = await response.json();
                    
                    const statusDiv = document.getElementById('status');
                    
                    if (result.success) {
                        statusDiv.className = 'status ' + (result.integration.status === 'CONNECTED' ? 'connected' : 'disconnected');
                        let statusText = 'Статус: ' + result.integration.connectionStatus;
                        
                        if (result.integration.displayName) {
                            statusText += ' - ' + result.integration.displayName + ' (' + result.integration.phoneNumber + ')';
                        }
                        
                        statusDiv.textContent = statusText;
                        log('📊 ' + statusText);
                    } else {
                        statusDiv.className = 'status error';
                        statusDiv.textContent = 'Ошибка: ' + result.error;
                        log('❌ Ошибка статуса: ' + result.error);
                    }
                } catch (error) {
                    log('❌ Ошибка проверки статуса: ' + error.message);
                }
            }
            
            async function getQRCode() {
                updateCompanyId();
                
                try {
                    const response = await fetch('/api/whatsapp/qr/' + currentCompanyId);
                    const result = await response.json();
                    
                    const qrDiv = document.getElementById('qrcode');
                    
                    if (result.success) {
                        qrDiv.innerHTML = '<p>📱 Отсканируйте QR код в WhatsApp:</p><img src="' + result.qrCode + '" alt="QR Code">';
                        log('📱 QR код получен');
                    } else {
                        qrDiv.innerHTML = '<p>❌ ' + result.message + '</p>';
                        log('❌ QR код недоступен: ' + result.message);
                    }
                } catch (error) {
                    log('❌ Ошибка получения QR кода: ' + error.message);
                }
            }
            
            async function sendMessage() {
                updateCompanyId();
                const phoneNumber = document.getElementById('phoneNumber').value;
                const message = document.getElementById('messageText').value;
                
                if (!phoneNumber || !message) {
                    log('❌ Введите номер телефона и сообщение');
                    return;
                }
                
                log('📤 Отправка сообщения на ' + phoneNumber);
                
                try {
                    const response = await fetch('/api/message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            companyId: currentCompanyId,
                            integrationType: 'WHATSAPP',
                            recipient: phoneNumber,
                            message: message
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        log('✅ Сообщение отправлено! ID: ' + result.messageId);
                    } else {
                        log('❌ Ошибка отправки: ' + result.error);
                    }
                } catch (error) {
                    log('❌ Сетевая ошибка отправки: ' + error.message);
                }
            }
            
            async function getChats() {
                updateCompanyId();
                log('📂 Получение списка чатов... (не реализовано)');
            }
            
            async function getAllStats() {
                log('📊 Получение статистики всех клиентов... (не реализовано)');
            }
            
            async function disconnect() {
                updateCompanyId();
                
                if (!confirm('Отключить WhatsApp клиент для ' + currentCompanyId + '?')) {
                    return;
                }
                
                log('🗑️ Отключение клиента...');
                
                try {
                    const response = await fetch('/api/integrations/whatsapp/disconnect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ companyId: currentCompanyId })
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        log('✅ Клиент отключен');
                        document.getElementById('qrcode').innerHTML = '';
                        setTimeout(checkStatus, 1000);
                    } else {
                        log('❌ Ошибка отключения: ' + result.error);
                    }
                } catch (error) {
                    log('❌ Сетевая ошибка отключения: ' + error.message);
                }
            }
            
            // Проверяем статус при загрузке страницы
            checkStatus();
        </script>
    </body>
    </html>
  `);
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Server запущен на http://localhost:${PORT}`);
  console.log(`📱 Откройте браузер и перейдите на указанный адрес`);
  console.log('');
  console.log('✅ Функции:');
  console.log('  - Headless WhatsApp клиенты');
  console.log('  - Долгоживущие сессии с LocalAuth');
  console.log('  - QR код авторизация');
  console.log('  - Отправка сообщений');
  console.log('  - Получение списка чатов');
  console.log('  - Управление несколькими компаниями');
});

// Обработка завершения процесса
process.on('SIGINT', () => {
  console.log('\n🛑 Завершение работы сервера...');
  process.exit(0);
});
