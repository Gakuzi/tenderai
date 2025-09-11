const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const port = 3001;

app.use(express.json());
app.use(express.static('public'));

// Главная страница мониторинга
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>TenderAI - Мониторинг интеграций</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .status { padding: 15px; margin: 10px 0; border-radius: 5px; }
            .status.connected { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .status.error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .status.disconnected { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
            button { padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; }
            .btn-primary { background: #007bff; color: white; }
            .btn-success { background: #28a745; color: white; }
            .btn-danger { background: #dc3545; color: white; }
            .logs { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; height: 300px; overflow-y: auto; }
            .integration { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
            input[type="text"] { padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 200px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 TenderAI - Мониторинг интеграций мессенджеров</h1>
            </div>
            
            <div class="integration">
                <h3>📱 WhatsApp Web</h3>
                <div id="whatsapp-status" class="status disconnected">
                    Статус: Проверяется...
                </div>
                <button class="btn-primary" onclick="checkWhatsApp()">Проверить статус</button>
                <button class="btn-success" onclick="authWhatsApp()">Авторизация</button>
                <button class="btn-danger" onclick="testWhatsApp()">Тест отправки</button>
            </div>
            
            <div class="integration">
                <h3>💬 Telegram Web</h3>
                <div id="telegram-status" class="status disconnected">
                    Статус: Проверяется...
                </div>
                <button class="btn-primary" onclick="checkTelegram()">Проверить статус</button>
                <button class="btn-success" onclick="authTelegram()">Авторизация</button>
            </div>
            
            <div class="integration">
                <h3>📤 Тест отправки сообщения</h3>
                <input type="text" id="test-phone" value="+79214962555" placeholder="Номер телефона">
                <input type="text" id="test-message" value="Тест из TenderAI!" placeholder="Сообщение">
                <button class="btn-success" onclick="sendTestMessage()">Отправить</button>
            </div>
            
            <div class="integration">
                <h3>📝 Логи</h3>
                <div id="logs" class="logs">
                    Инициализация...
                </div>
                <button class="btn-primary" onclick="refreshLogs()">Обновить логи</button>
            </div>
        </div>

        <script>
            function log(message) {
                const logs = document.getElementById('logs');
                const timestamp = new Date().toLocaleTimeString();
                logs.innerHTML += timestamp + ' - ' + message + '\\n';
                logs.scrollTop = logs.scrollHeight;
            }

            function checkWhatsApp() {
                log('Проверка статуса WhatsApp...');
                fetch('/api/check/whatsapp')
                    .then(r => r.json())
                    .then(data => {
                        const statusDiv = document.getElementById('whatsapp-status');
                        statusDiv.className = 'status ' + (data.status === 'CONNECTED' ? 'connected' : 'disconnected');
                        statusDiv.innerHTML = 'WhatsApp: ' + data.status + (data.displayName ? ' - ' + data.displayName : '');
                        log('WhatsApp статус: ' + data.status);
                    })
                    .catch(e => {
                        log('Ошибка проверки WhatsApp: ' + e);
                    });
            }

            function authWhatsApp() {
                log('Запуск авторизации WhatsApp...');
                fetch('/api/auth/whatsapp', { method: 'POST' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            log('QR-код сгенерирован. Отсканируйте в WhatsApp.');
                        } else {
                            log('Ошибка генерации QR-кода: ' + data.error);
                        }
                    });
            }

            function testWhatsApp() {
                const phone = document.getElementById('test-phone').value;
                const message = document.getElementById('test-message').value;
                log('Отправка тестового сообщения WhatsApp на ' + phone + '...');
                
                fetch('/api/send/whatsapp', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({phone, message})
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        log('✅ Сообщение отправлено успешно!');
                    } else {
                        log('❌ Ошибка отправки: ' + data.error);
                    }
                });
            }

            function sendTestMessage() {
                testWhatsApp();
            }

            function refreshLogs() {
                fetch('/api/logs')
                    .then(r => r.json())
                    .then(data => {
                        const logs = document.getElementById('logs');
                        logs.innerHTML = data.logs.join('\\n');
                        logs.scrollTop = logs.scrollHeight;
                    });
            }

            // Автообновление каждые 5 секунд
            setInterval(() => {
                checkWhatsApp();
            }, 5000);

            // Инициализация
            checkWhatsApp();
            log('Система мониторинга запущена');
        </script>
    </body>
    </html>
  `);
});

// API endpoints
app.get('/api/check/whatsapp', (req, res) => {
  const child = spawn('npx', ['tsx', '-e', `
    process.env.NODE_ENV = 'production';
    import { prisma } from './lib/prisma';
    (async () => {
      try {
        const integration = await prisma.whatsAppIntegration.findFirst({
          where: { status: 'CONNECTED' },
          orderBy: { lastCheckedAt: 'desc' }
        });
        const result = integration ? {
          status: integration.status,
          displayName: integration.displayName,
          id: integration.id,
          lastChecked: integration.lastCheckedAt
        } : { status: 'DISCONNECTED' };
        console.log('RESULT:' + JSON.stringify(result));
      } catch (error) {
        console.log('RESULT:' + JSON.stringify({ status: 'ERROR', error: error.message }));
      }
    })();
  `]);

  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  child.on('close', (code) => {
    try {
      // Извлекаем только строку с результатом
      const lines = output.split('\n');
      const resultLine = lines.find(line => line.startsWith('RESULT:'));
      
      if (resultLine) {
        const jsonStr = resultLine.replace('RESULT:', '');
        const data = JSON.parse(jsonStr);
        res.json(data);
      } else {
        res.json({ status: 'ERROR', error: 'No result found', output });
      }
    } catch (e) {
      res.json({ status: 'ERROR', error: e.message, output });
    }
  });
});

app.post('/api/auth/whatsapp', (req, res) => {
  console.log('Starting WhatsApp authentication...');
  
  const child = spawn('npx', ['tsx', 'reauth-whatsapp.ts']);
  
  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
    console.log(data.toString());
  });

  child.on('close', (code) => {
    const success = output.includes('Авторизация прошла успешно');
    const qrGenerated = output.includes('QR-код сгенерирован');
    
    res.json({ 
      success: success || qrGenerated,
      message: success ? 'Authentication completed' : qrGenerated ? 'QR code generated - scan it' : 'Authentication failed',
      output: output.slice(-1000) // последние 1000 символов
    });
  });
});

app.post('/api/send/whatsapp', (req, res) => {
  const { phone, message } = req.body;
  console.log('Sending WhatsApp message to:', phone);
  
  const child = spawn('npx', ['tsx', 'test-message-send.ts']);
  
  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
    console.log(data.toString());
  });

  child.on('close', (code) => {
    const success = output.includes('Сообщение отправлено успешно');
    res.json({ 
      success,
      message: success ? 'Message sent' : 'Failed to send message',
      output: output.slice(-500) // последние 500 символов
    });
  });
});

app.listen(port, () => {
  console.log(`🚀 TenderAI Monitor Server запущен на http://localhost:${port}`);
  console.log('Откройте браузер и перейдите на указанный адрес для мониторинга интеграций');
});
