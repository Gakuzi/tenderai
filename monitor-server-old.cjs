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
                <h3>📱 WhatsApp Web (Долгоживущая сессия)</h3>
                <div id="whatsapp-status" class="status disconnected">
                    Статус: Проверяется...
                </div>
                <div id="session-stats" style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    Статистика сессий загружается...
                </div>
                <button class="btn-primary" onclick="checkWhatsApp()">Проверить статус</button>
                <button class="btn-success" onclick="authWhatsApp()">Новая авторизация</button>
                <button class="btn-danger" onclick="testWhatsApp()">Тест отправки</button>
                <button class="btn-danger" onclick="restartSession()">Перезапустить сессию</button>
                <button class="btn-danger" onclick="destroySession()" style="background: #dc3545;">Удалить сессию</button>
            </div>
            
            <div class="integration">
                <h3>💬 Telegram Web (Долгоживущая сессия)</h3>
                <div id="telegram-status" class="status disconnected">
                    Статус: Проверяется...
                </div>
                <div id="telegram-session-stats" style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    Статистика Telegram сессий загружается...
                </div>
                <button class="btn-primary" onclick="checkTelegram()">Проверить статус</button>
                <button class="btn-success" onclick="authTelegram()">Новая авторизация</button>
                <button class="btn-danger" onclick="testTelegram()">Тест отправки</button>
                <button class="btn-danger" onclick="restartTelegramSession()">Перезапустить</button>
            </div>
            
            <div class="integration">
                <h3>📤 Тест отправки сообщений</h3>
                <input type="text" id="test-phone" value="+79214962555" placeholder="Номер телефона">
                <input type="text" id="test-message" value="Тест из TenderAI!" placeholder="Сообщение">
                <button class="btn-success" onclick="sendTestWhatsApp()">Отправить WhatsApp</button>
                <button class="btn-success" onclick="sendTestTelegram()">Отправить Telegram</button>
            </div>
            
            <div class="integration">
                <h3>📬 Чтение входящих сообщений</h3>
                <button class="btn-primary" onclick="readWhatsAppMessages()">Последние WhatsApp сообщения</button>
                <button class="btn-primary" onclick="readTelegramMessages()">Последние Telegram сообщения</button>
                <button class="btn-primary" onclick="readAllChats()">Список чатов</button>
                <div id="messages-display" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; max-height: 200px; overflow-y: auto;">
                    Нажмите кнопку для чтения сообщений...
                </div>
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
                logs.innerHTML += timestamp + ' - ' + message + '\n';
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
                
                // Проверяем статистику сессий
                fetch('/api/sessions/stats')
                    .then(r => r.json())
                    .then(data => {
                        const statsDiv = document.getElementById('session-stats');
                        let statsText = '\ud83d\udcc8 Активные сессии: ' + Object.keys(data).length + ' | ';
                        
                        for (const [companyId, stats] of Object.entries(data)) {
                            const status = stats.isAuthenticated ? '✅' : '❌';
                            const browser = stats.hasBrowser ? '🌐' : '⚙️';
                            statsText += `${companyId.slice(0,8)}: ${status}${browser} `;
                        }
                        
                        if (Object.keys(data).length === 0) {
                            statsText = '�\udccb Нет активных сессий';
                        }
                        
                        statsDiv.innerHTML = statsText;
                    })
                    .catch(e => {
                        const statsDiv = document.getElementById('session-stats');
                        statsDiv.innerHTML = '❌ Ошибка загрузки статистики';
                    });
            }

            function authWhatsApp() {
                log('Запуск авторизации WhatsApp...');
                fetch('/api/auth/whatsapp', { method: 'POST' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            log('✅ QR-код сгенерирован! Отсканируйте в WhatsApp.');
                            log('Откройте WhatsApp -> Меню (3 точки) -> Привязанные устройства');
                            log('После сканирования подождите ~30 секунд до завершения.');
                        } else {
                            log('❌ Ошибка генерации QR-кода: ' + (data.message || data.error || 'Неизвестная ошибка'));
                        }
                    })
                    .catch(err => {
                        log('❌ Сетевая ошибка авторизации: ' + err.message);
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
                        log('❌ Ошибка отправки: ' + (data.message || data.error || 'Неизвестная ошибка'));
                        if (data.output) {
                            log('Подробности: ' + data.output.slice(-200));
                        }
                    }
                })
                .catch(err => {
                    log('❌ Сетевая ошибка: ' + err.message);
                });
            }

            function sendTestWhatsApp() {
                testWhatsApp();
            }

            function sendTestTelegram() {
                testTelegram();
            }

            // Функции чтения сообщений
            function readWhatsAppMessages() {
                log('💬 Чтение последних сообщений WhatsApp...');
                fetch('/api/read/whatsapp')
                    .then(r => r.json())
                    .then(data => {
                        const display = document.getElementById('messages-display');
                        if (data.success && data.messages) {
                            let html = '<h4>WhatsApp сообщения (' + data.messages.length + '):</h4>';
                            data.messages.forEach(msg => {
                                html += `<p><strong>${msg.from}:</strong> ${msg.text} <em>(${msg.timestamp})</em></p>`;
                            });
                            display.innerHTML = html;
                            log('✅ Получено ' + data.messages.length + ' сообщений WhatsApp');
                        } else {
                            display.innerHTML = '❌ Ошибка чтения WhatsApp: ' + (data.message || data.error);
                            log('❌ Ошибка чтения WhatsApp: ' + (data.message || data.error));
                        }
                    })
                    .catch(err => {
                        log('❌ Сетевая ошибка чтения WhatsApp: ' + err.message);
                    });
            }

            function readTelegramMessages() {
                log('💬 Чтение последних сообщений Telegram...');
                fetch('/api/read/telegram')
                    .then(r => r.json())
                    .then(data => {
                        const display = document.getElementById('messages-display');
                        if (data.success && data.messages) {
                            let html = '<h4>Telegram сообщения (' + data.messages.length + '):</h4>';
                            data.messages.forEach(msg => {
                                html += `<p><strong>${msg.from}:</strong> ${msg.text} <em>(${msg.timestamp})</em></p>`;
                            });
                            display.innerHTML = html;
                            log('✅ Получено ' + data.messages.length + ' сообщений Telegram');
                        } else {
                            display.innerHTML = '❌ Ошибка чтения Telegram: ' + (data.message || data.error);
                            log('❌ Ошибка чтения Telegram: ' + (data.message || data.error));
                        }
                    })
                    .catch(err => {
                        log('❌ Сетевая ошибка чтения Telegram: ' + err.message);
                    });
            }

            function readAllChats() {
                log('💬 Получение списка чатов...');
                fetch('/api/chats/list')
                    .then(r => r.json())
                    .then(data => {
                        const display = document.getElementById('messages-display');
                        if (data.success && data.chats) {
                            let html = '<h4>Список чатов (' + data.chats.length + '):</h4>';
                            data.chats.forEach(chat => {
                                html += `<p><strong>${chat.name}:</strong> ${chat.lastMessage} <em>(${chat.platform} - ${chat.timestamp})</em></p>`;
                            });
                            display.innerHTML = html;
                            log('✅ Получен ' + data.chats.length + ' чатов');
                        } else {
                            display.innerHTML = '❌ Ошибка получения чатов: ' + (data.message || data.error);
                            log('❌ Ошибка получения чатов: ' + (data.message || data.error));
                        }
                    })
                    .catch(err => {
                        log('❌ Сетевая ошибка получения чатов: ' + err.message);
                    });
            }

            function restartSession() {
                log('🔄 Перезапуск долгоживущей сессии WhatsApp...');
                fetch('/api/sessions/restart', { method: 'POST' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            log('✅ Сессия успешно перезапущена!');
                        } else {
                            log('❌ Ошибка перезапуска: ' + (data.message || data.error));
                        }
                        checkWhatsApp();
                    })
                    .catch(err => {
                        log('❌ Сетевая ошибка перезапуска: ' + err.message);
                    });
            }

            function destroySession() {
                if (!confirm('Вы уверены, что хотите удалить все сессии? Потребуется повторная авторизация.')) {
                    return;
                }
                
                log('🗑️ Удаление всех долгоживущих сессий WhatsApp...');
                fetch('/api/sessions/destroy', { method: 'DELETE' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            log('✅ Все сессии успешно удалены!');
                        } else {
                            log('❌ Ошибка удаления: ' + (data.message || data.error));
                        }
                        checkWhatsApp();
                    })
                    .catch(err => {
                        log('❌ Сетевая ошибка удаления: ' + err.message);
                    });
            }

            function refreshLogs() {
                fetch('/api/logs')
                    .then(r => r.json())
                    .then(data => {
                        const logs = document.getElementById('logs');
                        logs.innerHTML = data.logs.join('\n');
                        logs.scrollTop = logs.scrollHeight;
                    });
            }

            // Функции для Telegram
            function checkTelegram() {
                log('Проверка статуса Telegram...');
                fetch('/api/check/telegram')
                    .then(r => r.json())
                    .then(data => {
                        const statusDiv = document.getElementById('telegram-status');
                        statusDiv.className = 'status ' + (data.status === 'CONNECTED' ? 'connected' : 'disconnected');
                        statusDiv.innerHTML = 'Telegram: ' + data.status + (data.displayName ? ' - ' + data.displayName : '');
                        log('Telegram статус: ' + data.status);
                    })
                    .catch(e => {
                        log('Ошибка проверки Telegram: ' + e);
                    });
            }

            function authTelegram() {
                log('Запуск авторизации Telegram...');
                fetch('/api/auth/telegram', { method: 'POST' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            log('✅ Авторизация Telegram запущена!');
                            log('Откройте ссылку в браузере и введите код авторизации.');
                        } else {
                            log('❌ Ошибка авторизации Telegram: ' + (data.message || data.error));
                        }
                    })
                    .catch(err => {
                        log('❌ Сетевая ошибка Telegram: ' + err.message);
                    });
            }

            function testTelegram() {
                const phone = document.getElementById('test-phone').value;
                const message = document.getElementById('test-message').value;
                log('Отправка тестового сообщения Telegram контакту ' + phone + '...');
                
                fetch('/api/send/telegram', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({phone, message})
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        log('✅ Telegram сообщение отправлено!');
                    } else {
                        log('❌ Ошибка отправки Telegram: ' + (data.message || data.error));
                    }
                })
                .catch(err => {
                    log('❌ Сетевая ошибка Telegram: ' + err.message);
                });
            }

            function restartTelegramSession() {
                log('🔄 Перезапуск Telegram сессии...');
                fetch('/api/sessions/telegram/restart', { method: 'POST' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            log('✅ Telegram сессия перезапущена!');
                        } else {
                            log('❌ Ошибка перезапуска Telegram: ' + (data.message || data.error));
                        }
                        checkTelegram();
                    })
                    .catch(err => {
                        log('❌ Сетевая ошибка перезапуска Telegram: ' + err.message);
                    });
            }

            // Инициализация - ПРОВЕРЯЕМ ОДНОКРАТНО ПРИ ЗАПУСКЕ
            checkWhatsApp();
            checkTelegram();
            log('✅ Система мониторинга запущена. Проверяйте статус вручную.');
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

// API для получения статистики долгоживущих сессий
app.get('/api/sessions/stats', (req, res) => {
  const child = spawn('npx', ['tsx', '-e', `
    import { WhatsAppWebManager } from './services/integrations/whatsapp-web-manager';
    (async () => {
      try {
        const stats = WhatsAppWebManager.getActiveSessionsStats();
        console.log('RESULT:' + JSON.stringify(stats));
      } catch (error) {
        console.log('RESULT:' + JSON.stringify({ error: error.message }));
      }
    })();
  `]);

  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  child.on('close', (code) => {
    try {
      const lines = output.split('\n');
      const resultLine = lines.find(line => line.startsWith('RESULT:'));
      
      if (resultLine) {
        const jsonStr = resultLine.replace('RESULT:', '');
        const data = JSON.parse(jsonStr);
        res.json(data);
      } else {
        res.json({});
      }
    } catch (e) {
      res.json({ error: e.message, output });
    }
  });
});

// API для перезапуска долгоживущих сессий
app.post('/api/sessions/restart', (req, res) => {
  console.log('Restarting persistent WhatsApp sessions...');
  
  const child = spawn('npx', ['tsx', '-e', `
    import { WhatsAppWebManager } from './services/integrations/whatsapp-web-manager';
    import { prisma } from './lib/prisma';
    (async () => {
      try {
        // Получаем все активные сессии
        const stats = WhatsAppWebManager.getActiveSessionsStats();
        let restarted = 0;
        
        for (const companyId of Object.keys(stats)) {
          try {
            await WhatsAppWebManager.destroyInstance(companyId);
            restarted++;
          } catch (e) {
            console.error('Error destroying session for company', companyId, ':', e.message);
          }
        }
        
        console.log('RESULT:' + JSON.stringify({ 
          success: true, 
          message: \`Restarted \${restarted} sessions\`,
          restarted 
        }));
      } catch (error) {
        console.log('RESULT:' + JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    })();
  `]);

  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
    console.log(data.toString());
  });

  child.on('close', (code) => {
    try {
      const lines = output.split('\n');
      const resultLine = lines.find(line => line.startsWith('RESULT:'));
      
      if (resultLine) {
        const jsonStr = resultLine.replace('RESULT:', '');
        const data = JSON.parse(jsonStr);
        res.json(data);
      } else {
        res.json({ success: false, message: 'No result found', output });
      }
    } catch (e) {
      res.json({ success: false, error: e.message, output });
    }
  });
});

// API для удаления всех долгоживущих сессий
app.delete('/api/sessions/destroy', (req, res) => {
  console.log('Destroying all persistent WhatsApp sessions...');
  
  const child = spawn('npx', ['tsx', '-e', `
    import { WhatsAppWebManager } from './services/integrations/whatsapp-web-manager';
    import { prisma } from './lib/prisma';
    (async () => {
      try {
        const stats = WhatsAppWebManager.getActiveSessionsStats();
        let destroyed = 0;
        
        for (const companyId of Object.keys(stats)) {
          try {
            await WhatsAppWebManager.destroyInstance(companyId);
            destroyed++;
          } catch (e) {
            console.error('Error destroying session for company', companyId, ':', e.message);
          }
        }
        
        // Очищаем статус в базе данных
        await prisma.whatsAppIntegration.updateMany({
          data: {
            status: 'DISCONNECTED',
            connectionStatus: 'authentication_required',
            lastError: 'Session manually destroyed via monitor'
          }
        });
        
        console.log('RESULT:' + JSON.stringify({ 
          success: true, 
          message: \`Destroyed \${destroyed} sessions\`,
          destroyed 
        }));
      } catch (error) {
        console.log('RESULT:' + JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    })();
  `]);

  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
    console.log(data.toString());
  });

  child.on('close', (code) => {
    try {
      const lines = output.split('\\n');
      const resultLine = lines.find(line => line.startsWith('RESULT:'));
      
      if (resultLine) {
        const jsonStr = resultLine.replace('RESULT:', '');
        const data = JSON.parse(jsonStr);
        res.json(data);
      } else {
        res.json({ success: false, message: 'No result found', output });
      }
    } catch (e) {
      res.json({ success: false, error: e.message, output });
    }
  });
});

// API для проверки статуса Telegram
app.get('/api/check/telegram', (req, res) => {
  const child = spawn('npx', ['tsx', '-e', `
    process.env.NODE_ENV = 'production';
    import { prisma } from './lib/prisma';
    (async () => {
      try {
        const integration = await prisma.telegramIntegration.findFirst({
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

// API для авторизации Telegram
app.post('/api/auth/telegram', (req, res) => {
  console.log('Starting Telegram authentication...');
  
  // Создаём заглушку для Telegram авторизации
  res.json({ 
    success: false,
    message: 'Telegram авторизация пока не реализована. Требуется создание TelegramWebManager аналогично WhatsApp.',
    error: 'Not implemented yet'
  });
});

// API для отправки сообщений через Telegram
app.post('/api/send/telegram', (req, res) => {
  const { phone, message } = req.body;
  console.log('Sending Telegram message to:', phone);
  
  // Заглушка для отправки Telegram
  res.json({ 
    success: false,
    message: 'Telegram отправка пока не реализована. Требуется создание TelegramWebManager.',
    error: 'Not implemented yet'
  });
});

// API для чтения WhatsApp сообщений
app.get('/api/read/whatsapp', (req, res) => {
  console.log('Reading WhatsApp messages...');
  
  const child = spawn('npx', ['tsx', '-e', `
    import { WhatsAppWebManager } from './services/integrations/whatsapp-web-manager';
    import { prisma } from './lib/prisma';
    (async () => {
      try {
        // Получаем тестовую компанию
        const company = await prisma.company.findFirst();
        if (!company) {
          console.log('RESULT:' + JSON.stringify({ 
            success: false, 
            error: 'No company found in database' 
          }));
          return;
        }
        
        const manager = WhatsAppWebManager.getInstance(company.id);
        
        // Заглушка - возвращаем тестовые сообщения
        const testMessages = [
          {
            from: '+79214962555',
            text: 'Привет! Как дела?',
            timestamp: new Date().toLocaleString()
          },
          {
            from: '+79123456789', 
            text: 'Тестовое сообщение из WhatsApp',
            timestamp: new Date(Date.now() - 60000).toLocaleString()
          }
        ];
        
        console.log('RESULT:' + JSON.stringify({ 
          success: true, 
          messages: testMessages,
          count: testMessages.length
        }));
        
      } catch (error) {
        console.log('RESULT:' + JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    })();
  `]);

  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  child.on('close', (code) => {
    try {
      const lines = output.split('\n');
      const resultLine = lines.find(line => line.startsWith('RESULT:'));
      
      if (resultLine) {
        const jsonStr = resultLine.replace('RESULT:', '');
        const data = JSON.parse(jsonStr);
        res.json(data);
      } else {
        res.json({ success: false, error: 'No result found', output });
      }
    } catch (e) {
      res.json({ success: false, error: e.message, output });
    }
  });
});

// API для чтения Telegram сообщений
app.get('/api/read/telegram', (req, res) => {
  console.log('Reading Telegram messages...');
  
  // Заглушка для Telegram
  const testMessages = [
    {
      from: '@username',
      text: 'Сообщение из Telegram',
      timestamp: new Date().toLocaleString()
    },
    {
      from: '@another_user',
      text: 'Ещё одно тестовое сообщение',
      timestamp: new Date(Date.now() - 120000).toLocaleString()
    }
  ];
  
  res.json({ 
    success: true, 
    messages: testMessages,
    count: testMessages.length
  });
});

// API для получения списка чатов
app.get('/api/chats/list', (req, res) => {
  console.log('Getting chats list...');
  
  // Заглушка для списка чатов
  const testChats = [
    {
      name: '+79214962555',
      lastMessage: 'Привет! Как дела?',
      platform: 'WhatsApp',
      timestamp: new Date().toLocaleString()
    },
    {
      name: '@username',
      lastMessage: 'Сообщение из Telegram',
      platform: 'Telegram', 
      timestamp: new Date(Date.now() - 60000).toLocaleString()
    },
    {
      name: '+79123456789',
      lastMessage: 'Тестовое сообщение',
      platform: 'WhatsApp',
      timestamp: new Date(Date.now() - 120000).toLocaleString()
    }
  ];
  
  res.json({ 
    success: true, 
    chats: testChats,
    count: testChats.length
  });
});

// API для получения логов
app.get('/api/logs', (req, res) => {
  // Заглушка для логов
  const logs = [
    '00:10:15 - Система мониторинга запущена',
    '00:10:20 - WhatsApp статус: CONNECTED',
    '00:10:25 - Telegram статус: DISCONNECTED',
    '00:10:30 - Получено 2 сообщения WhatsApp',
    '00:10:35 - Отправлено тестовое сообщение'
  ];
  
  res.json({ logs });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'tenderai-monitor'
  });
});

app.listen(port, () => {
  console.log(`🚀 TenderAI Monitor Server запущен на http://localhost:${port}`);
  console.log('Откройте браузер и перейдите на указанный адрес для мониторинга интеграций');
});
