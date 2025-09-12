#!/bin/bash

echo "🚀 ЗАПУСК TENDERAI + WHATSAPP"

# Убиваем все старые процессы
pkill -f vite 2>/dev/null
pkill -f node 2>/dev/null  
pkill -f integration 2>/dev/null
sleep 2

echo "✅ Старые процессы остановлены"

# Запускаем интерфейс в фоне
echo "🌐 Запуск интерфейса..."
nohup npm run dev > interface.log 2>&1 &
INTERFACE_PID=$!

# Ждем запуска интерфейса
sleep 5

# Запускаем реальный WhatsApp API сервер
echo "💬 Запуск реального WhatsApp сервера..."
nohup npx ts-node dev-whatsapp-server.ts > whatsapp-api.log 2>&1 &
WHATSAPP_PID=$!
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Эмуляция API WhatsApp
app.get('/api/whatsapp/status/:companyId', (req, res) => {
  res.json({
    success: true,
    status: 'ready',
    connected: true,
    info: {
      pushname: 'TenderAI Bot',
      phone: '+7900123456',
      platform: 'whatsapp-web'
    }
  });
});

app.post('/api/whatsapp/initialize/:companyId', (req, res) => {
  res.json({ success: true, message: 'Инициализация завершена' });
});

app.get('/api/whatsapp/qr/:companyId', (req, res) => {
  res.json({
    success: true,
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    expires: new Date(Date.now() + 300000).toISOString()
  });
});

app.post('/api/whatsapp/send/:companyId', (req, res) => {
  res.json({ success: true, messageId: 'msg_' + Date.now() });
});

app.delete('/api/whatsapp/disconnect/:companyId', (req, res) => {
  res.json({ success: true });
});

const port = 3002;
app.listen(port, () => {
  console.log(\`✅ WhatsApp API сервер запущен на порту \${port}\`);
});
" > whatsapp-api.log 2>&1 &

WHATSAPP_PID=$!

sleep 2

# Определяем порт интерфейса
if grep -q "5173" interface.log; then
    INTERFACE_PORT=5173
elif grep -q "5174" interface.log; then
    INTERFACE_PORT=5174  
elif grep -q "5175" interface.log; then
    INTERFACE_PORT=5175
elif grep -q "5176" interface.log; then
    INTERFACE_PORT=5176
elif grep -q "5177" interface.log; then
    INTERFACE_PORT=5177
elif grep -q "5178" interface.log; then
    INTERFACE_PORT=5178
else
    INTERFACE_PORT="неизвестен"
fi

echo ""
echo "🎉 ВСЕ ЗАПУЩЕНО!"
echo "📱 Интерфейс: http://localhost:$INTERFACE_PORT"
echo "💬 WhatsApp API: http://localhost:3002"
echo "🔍 PID интерфейса: $INTERFACE_PID"
echo "🔍 PID WhatsApp: $WHATSAPP_PID"
echo ""
echo "📋 Логи:"
echo "  - interface.log (интерфейс)"  
echo "  - whatsapp-api.log (WhatsApp API)"