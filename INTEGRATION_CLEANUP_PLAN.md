# План очистки дублирующихся интеграций

## Текущее состояние (дублирующиеся компоненты):

### WhatsApp интеграции:
1. `services/integrations/whatsapp-web-manager.ts` ✅ ОСНОВНАЯ (самая развитая)
2. `whatsapp-server.cjs` ❌ ДУБЛИРУЕТ (отдельный сервер)
3. `components/WhatsAppIntegration.tsx` ✅ ОСНОВНАЯ (React компонент)

### Telegram интеграции:
1. `services/integrations/telegram-web-manager.ts` ❌ ДУБЛИРУЕТ (устаревший Puppeteer подход)
2. `services/integrations/telegram-gramjs-manager.ts` ✅ ОСНОВНАЯ (современный GramJS)
3. `telegram-server.cjs` ❌ ДУБЛИРУЕТ (отдельный сервер)

### Общие компоненты:
1. `services/integrations/integration-manager.ts` ✅ ОСНОВНАЯ (единая точка управления)
2. `services/integrations/web-session-manager.ts` ✅ ОСНОВНАЯ (базовый класс)
3. `services/integrations/message-sender.ts` ✅ ОСНОВНАЯ (отправка сообщений)
4. `services/communication-logger.ts` ✅ ОСНОВНАЯ (логирование)

### Тестовые/мониторинговые файлы:
1. `monitor-server.cjs` ❌ ДУБЛИРУЕТ (отдельный мониторинг сервер)
2. Множество файлов `test-*` ❌ УДАЛИТЬ (тестовые файлы)
3. `check-*.ts` ❌ УДАЛИТЬ (проверочные скрипты)

## План действий:

### 1. Удаляем дублирующиеся серверы
- Удаляем `whatsapp-server.cjs` (заменен на integration-manager)
- Удаляем `telegram-server.cjs` (заменен на integration-manager)
- Удаляем `monitor-server.cjs` (интеграция в основной UI)

### 2. Удаляем устаревший Telegram подход
- Удаляем `telegram-web-manager.ts` (Puppeteer подход неэффективен)
- Оставляем только `telegram-gramjs-manager.ts` (современный MTProto)

### 3. Очищаем тестовые файлы
- Удаляем все `test-*` файлы
- Удаляем все `check-*` файлы
- Сохраняем только основные рабочие компоненты

### 4. Единая архитектура
- `IntegrationManager` - единая точка входа для всех интеграций
- `WhatsAppWebManager` - только WhatsApp интеграция через Web
- `TelegramGramJSManager` - только Telegram через MTProto
- `CommunicationLogger` - единое логирование всех сообщений
- React компоненты интегрируются через `IntegrationManager`

### 5. API архитектура
Все интеграции работают через единый набор методов:
- `initializeQRAuth()` - инициализация с QR-кодом
- `waitForAuthentication()` - ожидание авторизации
- `sendMessage()` - отправка сообщений
- `getStatus()` - проверка статуса
- `disconnect()` - отключение

## Результат:
✅ Одна и только одна реализация для каждой интеграции
✅ Единый API для всех мессенджеров
✅ Централизованное логирование
✅ Удаление всего дублирующегося кода