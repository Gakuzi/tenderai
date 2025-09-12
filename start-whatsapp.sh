#!/bin/bash

# Скрипт запуска WhatsApp интеграций
echo "=== Запуск WhatsApp интеграций ==="

# Убиваем старые процессы
echo "Убиваем старые процессы..."
pkill -f whatsapp-server 2>/dev/null
pkill -f integration 2>/dev/null
pkill -f vite 2>/dev/null
sleep 2

# Запускаем интерфейс в фоне
echo "Запуск основного интерфейса..."
nohup npm run dev > interface.log 2>&1 &
INTERFACE_PID=$!
echo "Интерфейс запущен, PID: $INTERFACE_PID"

# Ждем запуска интерфейса
echo "Ожидание запуска интерфейса (5 сек)..."
sleep 5

# Проверяем какой порт используется
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
else
    INTERFACE_PORT="неизвестен"
fi

echo "Интерфейс доступен на порту: $INTERFACE_PORT"

# Запускаем WhatsApp интеграцию
echo "Запуск WhatsApp сервера..."
if [ -f "services/integrations/whatsapp-web-manager.ts" ]; then
    # Используем интеграционный менеджер
    nohup node -r ts-node/register services/integrations/integration-manager.ts > whatsapp.log 2>&1 &
    WHATSAPP_PID=$!
    echo "WhatsApp сервер запущен через integration-manager, PID: $WHATSAPP_PID"
else
    echo "ОШИБКА: Файл интеграций не найден!"
    exit 1
fi

# Ждем запуска
sleep 3

# Проверяем статус
echo ""
echo "=== СТАТУС СЕРВИСОВ ==="
echo "Интерфейс: порт $INTERFACE_PORT (PID: $INTERFACE_PID)"
echo "WhatsApp: PID $WHATSAPP_PID"

# Показываем логи
echo ""
echo "=== ЛОГИ ИНТЕРФЕЙСА ==="
tail -3 interface.log

echo ""
echo "=== ЛОГИ WHATSAPP ==="
tail -3 whatsapp.log

echo ""
echo "=== ЗАВЕРШЕНО ==="
echo "Интерфейс: http://localhost:$INTERFACE_PORT"
echo "WhatsApp API: http://localhost:3002"