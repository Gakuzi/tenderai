const express = require('express');
const cors = require('cors');
const path = require('path');
const telegramRoutes = require('./api/telegram.cjs');

const app = express();
const PORT = process.env.TELEGRAM_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api/telegram', telegramRoutes);

// Простая страница для тестирования
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>TenderAI Telegram Server</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            button { padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; }
            .btn-primary { background: #0088cc; color: white; }
            .btn-success { background: #28a745; color: white; }
            .btn-danger { background: #dc3545; color: white; }
            .btn-warning { background: #ffc107; color: white; }
            input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin: 5px; }
            .logs { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; height: 200px; overflow-y: auto; white-space: pre-wrap; }
            .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
            .status.connected { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .status.error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .status.disconnected { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
            .auth-form { display: none; background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .auth-form.show { display: block; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 TenderAI Telegram Server</h1>
                <p>Управление Telegram интеграциями с GramJS (MTProto)</p>
            </div>
            
            <div class="section">
                <h3>🚀 Авторизация в Telegram</h3>
                <input type="text" id="companyId" placeholder="Company ID" value="test-company-123">
                <input type="text" id="phoneNumber" placeholder="+7XXXXXXXXXX" value="">
                <button class="btn-primary" onclick="startAuth()">Начать авторизацию</button>
                <button class="btn-success" onclick="checkStatus()">Проверить статус</button>
                <button class="btn-danger" onclick="disconnect()">Отключить</button>
                <div id="status" class="status disconnected">Статус: Не инициализирован</div>
                
                <div id="authForm" class="auth-form">
                    <h4>📱 Введите код из SMS</h4>
                    <input type="text" id="phoneCode" placeholder="Код из SMS" maxlength="5">
                    <input type="password" id="password" placeholder="Пароль (если есть)" style="display:none;">
                    <button class="btn-success" onclick="completeAuth()">Подтвердить</button>
                    <button class="btn-warning" onclick="showPasswordField()">Нужен пароль</button>
                </div>
            </div>
            
            <div class="section">
                <h3>💬 Чаты</h3>
                <button class="btn-primary" onclick="getChats()">Получить список чатов</button>
                <div id="chats"></div>
            </div>
            
            <div class="section">
                <h3>📤 Отправка сообщения</h3>
                <input type="text" id="chatId" placeholder="ID чата" value="">
                <input type="text" id="messageText" placeholder="Сообщение" value="Тест из TenderAI Telegram!">
                <button class="btn-success" onclick="sendMessage()">Отправить сообщение</button>
            </div>
            
            <div class="section">
                <h3>📝 Логи</h3>
                <div id="logs" class="logs">Инициализация Telegram сервера...\\n</div>
                <button class="btn-primary" onclick="clearLogs()">Очистить логи</button>
            </div>
        </div>

        <script>
            let currentCompanyId = 'test-company-123';
            let currentIntegrationId = null;
            
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
            
            async function startAuth() {
                updateCompanyId();
                const phoneNumber = document.getElementById('phoneNumber').value;
                
                if (!phoneNumber) {
                    log('❌ Введите номер телефона');
                    return;
                }
                
                log('🚀 Начинаем авторизацию в Telegram для ' + currentCompanyId);
                
                try {
                    const response = await fetch('/api/telegram/auth/start/' + currentCompanyId, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            phoneNumber: phoneNumber,
                            integrationId: currentIntegrationId 
                        })
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        log('✅ ' + result.message);
                        currentIntegrationId = result.integrationId;
                        document.getElementById('authForm').classList.add('show');
                    } else {
                        log('❌ Ошибка: ' + result.error);
                    }
                } catch (error) {
                    log('❌ Сетевая ошибка: ' + error.message);
                }
            }
            
            function showPasswordField() {
                document.getElementById('password').style.display = 'block';
                log('📝 Поле пароля активировано');
            }
            
            async function completeAuth() {
                const phoneCode = document.getElementById('phoneCode').value;
                const password = document.getElementById('password').value;
                
                if (!phoneCode) {
                    log('❌ Введите код из SMS');
                    return;
                }
                
                log('🔐 Завершаем авторизацию...');
                
                try {
                    const response = await fetch('/api/telegram/auth/complete/' + currentCompanyId, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            phoneCode: phoneCode,
                            password: password || undefined
                        })
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        log('✅ ' + result.message);
                        if (result.userInfo) {
                            log('👤 Пользователь: ' + result.userInfo.firstName + ' ' + (result.userInfo.lastName || ''));
                            if (result.userInfo.username) {
                                log('📱 Username: @' + result.userInfo.username);
                            }
                        }
                        document.getElementById('authForm').classList.remove('show');
                        setTimeout(checkStatus, 1000);
                        setTimeout(getChats, 2000);
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
                    const response = await fetch('/api/telegram/status/' + currentCompanyId);
                    const result = await response.json();
                    
                    const statusDiv = document.getElementById('status');
                    
                    if (result.success) {
                        statusDiv.className = 'status ' + (result.connected ? 'connected' : 'disconnected');
                        let statusText = 'Статус: ' + result.status;
                        
                        if (result.info) {
                            statusText += ' - ' + result.info.displayName;
                            if (result.info.username) {
                                statusText += ' (@' + result.info.username + ')';
                            }
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
            
            async function getChats() {
                updateCompanyId();
                
                try {
                    const response = await fetch('/api/telegram/chats/' + currentCompanyId);
                    const result = await response.json();
                    
                    const chatsDiv = document.getElementById('chats');
                    
                    if (result.success) {
                        let html = '<h4>📋 Список чатов (' + result.total + '):</h4>';
                        
                        result.chats.forEach(chat => {
                            const typeIcon = chat.type === 'private' ? '👤' : chat.type === 'group' ? '👥' : '📢';
                            html += '<div style="margin: 5px 0; padding: 10px; background: #f0f0f0; border-radius: 5px;">';
                            html += typeIcon + ' <strong>' + chat.title + '</strong> (ID: ' + chat.id + ')';
                            if (chat.lastMessage) {
                                html += '<br><small>💬 ' + chat.lastMessage.text.substring(0, 50) + (chat.lastMessage.text.length > 50 ? '...' : '') + '</small>';
                            }
                            html += '<button onclick="selectChat(\\'' + chat.id + '\\', \\'' + chat.title + '\\')" style="margin-left: 10px; padding: 5px 10px;">Выбрать</button>';
                            html += '</div>';
                        });
                        
                        chatsDiv.innerHTML = html;
                        log('📋 Загружено ' + result.total + ' чатов');
                    } else {
                        chatsDiv.innerHTML = '<p>❌ ' + result.error + '</p>';
                        log('❌ Ошибка загрузки чатов: ' + result.error);
                    }
                } catch (error) {
                    log('❌ Ошибка получения чатов: ' + error.message);
                }
            }
            
            function selectChat(chatId, chatTitle) {
                document.getElementById('chatId').value = chatId;
                log('✅ Выбран чат: ' + chatTitle + ' (ID: ' + chatId + ')');
            }
            
            async function sendMessage() {
                updateCompanyId();
                const chatId = document.getElementById('chatId').value;
                const message = document.getElementById('messageText').value;
                
                if (!chatId || !message) {
                    log('❌ Выберите чат и введите сообщение');
                    return;
                }
                
                log('📤 Отправка сообщения в чат ' + chatId);
                
                try {
                    const response = await fetch('/api/telegram/send/' + currentCompanyId, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chatId: chatId,
                            message: message
                        })
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        log('✅ ' + result.message + ' (ID: ' + result.messageId + ')');
                    } else {
                        log('❌ Ошибка отправки: ' + result.error);
                    }
                } catch (error) {
                    log('❌ Ошибка отправки сообщения: ' + error.message);
                }
            }
            
            async function disconnect() {
                updateCompanyId();
                
                if (!confirm('Отключить Telegram интеграцию?')) return;
                
                try {
                    const response = await fetch('/api/telegram/disconnect/' + currentCompanyId, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        log('✅ ' + result.message);
                        document.getElementById('status').className = 'status disconnected';
                        document.getElementById('status').textContent = 'Статус: Отключен';
                        document.getElementById('authForm').classList.remove('show');
                        document.getElementById('chats').innerHTML = '';
                    } else {
                        log('❌ Ошибка отключения: ' + result.error);
                    }
                } catch (error) {
                    log('❌ Ошибка отключения: ' + error.message);
                }
            }
            
            // Проверяем статус при загрузке
            checkStatus();
            
            log('🚀 Telegram Server готов к работе');
            log('ℹ️ Для работы нужны переменные среды TELEGRAM_API_ID и TELEGRAM_API_HASH');
            log('ℹ️ Получите их на https://my.telegram.org');
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🤖 TenderAI Telegram Server запущен на порту ${PORT}`);
  console.log(`🌐 Веб-интерфейс: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/telegram/`);
  
  // Проверяем переменные окружения
  if (!process.env.TELEGRAM_API_ID || !process.env.TELEGRAM_API_HASH) {
    console.log('⚠️  ВНИМАНИЕ: Не найдены TELEGRAM_API_ID и TELEGRAM_API_HASH');
    console.log('   Получите их на https://my.telegram.org');
    console.log('   Добавьте в .env файл:');
    console.log('   TELEGRAM_API_ID=your_api_id');
    console.log('   TELEGRAM_API_HASH=your_api_hash');
  } else {
    console.log('✅ Telegram API ключи найдены');
  }
});
