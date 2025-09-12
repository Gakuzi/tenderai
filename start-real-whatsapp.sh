#!/bin/bash

echo "🚀 ЗАПУСК TENDERAI + РЕАЛЬНЫЙ WHATSAPP"

# Убиваем все старые процессы
pkill -f vite 2>/dev/null
pkill -f node 2>/dev/null  
pkill -f ts-node 2>/dev/null
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

sleep 3

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
echo "🎉 РЕАЛЬНЫЙ WHATSAPP ЗАПУЩЕН!"
echo "📱 Интерфейс: http://localhost:$INTERFACE_PORT"
echo "💬 WhatsApp API: http://localhost:3002"
echo "🔍 PID интерфейса: $INTERFACE_PID"
echo "🔍 PID WhatsApp: $WHATSAPP_PID"
echo ""
echo "📋 Логи:"
echo "  - interface.log (интерфейс)"  
echo "  - whatsapp-api.log (реальный WhatsApp API)"
echo ""
echo "⚠️  ВНИМАНИЕ: Реальный WhatsApp требует базы данных!"
echo "   Если будут ошибки с Prisma, запустите сначала mock версию:"
echo "   ./start-all.sh"