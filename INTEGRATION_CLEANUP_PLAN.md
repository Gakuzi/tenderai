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

---

# ДОПОЛНЕНИЕ: Восстановление рабочей интеграции WhatsApp (пошагово)

Цель: вернуть реальную рабочую интеграцию WhatsApp (без моков), опираясь на ранее рабочие коммиты и сохранённые реализации.

## 1) Стратегия веток
- Создать рабочую ветку восстановления: `feature/whatsapp-recovery-from-working`
- Иметь «золотую» ветку с рабочим запуском: `working-whatsapp-mock-api` (для быстрой проверки UI)
- Основная разработка интеграций: `whatsapp-telegram-integrations`
- Продакшен/превью состояния UI: `main`

## 2) Поиск рабочих коммитов по WhatsApp
Искать по истории коммитов (за последние дни) ключевые точки:
- Коммиты с сообщениями: "Добавлен API endpoint для авторизации WhatsApp", "Исправлен API endpoint для проверки статуса WhatsApp"
- Зафиксированные файлы: `services/integrations/whatsapp-web-manager.ts`, `services/integrations/integration-manager.ts`, маршруты API, серверные логи

Ориентировочные найденные хэши (пример из истории):
- `c6321fd`: Добавлен API endpoint для авторизации WhatsApp
- `033141d`: Исправлен API endpoint для проверки статуса WhatsApp

Действия:
- Снять патчи с этих коммитов (git show) и перенести реализацию в текущую архитектуру (без дублирования серверов)

## 3) Целевое состояние реализации WhatsApp
- Единая точка входа: `services/integrations/integration-manager.ts`
- Реализация WhatsApp: `services/integrations/whatsapp-web-manager.ts`
- HTTP-API (если необходимо для фронта): маршруты в одном сервере интеграций либо прокси-слой в dev-режиме
- Контракты API:
  - `GET /api/whatsapp/status/:companyId` → { success, status, connected, info }
  - `POST /api/whatsapp/initialize/:companyId` → { success, ... }
  - `GET /api/whatsapp/qr/:companyId` → { success, qrCode, expires }
  - `POST /api/whatsapp/send/:companyId` → { success, messageId }
  - `DELETE /api/whatsapp/disconnect/:companyId` → { success }

## 4) План восстановления (пошагово)
1. Найти в истории минимально рабочие версии WhatsApp-менеджера и API-роутов (см. хэши выше)
2. Сравнить с текущими файлами и вынести различия в отдельные патчи
3. Внести правки в `integration-manager.ts`, чтобы:
   - Инициализация WhatsApp не зависела от старых отдельных серверов
   - Логика QR/сессий работала через единый менеджер
4. Восстановить/создать лёгкий интеграционный HTTP-слой (dev-only) для фронта на 3002 (если бекенд ещё не интегрирован), но без дублирования логики
5. Протестировать вручную эндпойнты (curl), затем из UI
6. Добавить минимальные e2e-тесты (скрипты curl) и зафиксировать команды в README/БЫСТРЫЙ_ЗАПУСК.md

## 5) Правила фиксации (русские комментарии в коммитах)
Каждый значимый шаг фиксировать отдельным коммитом:
- Шаблон сообщения:
  - Заголовок: "ИСПРАВЛЕНО/ДОБАВЛЕНО/РЕФАКТОР: кратко что сделано"
  - Тело: "ПРОБЛЕМА", "РЕШЕНИЕ", "РЕЗУЛЬТАТ", "ФАЙЛЫ", "КАК ПРОВЕРИТЬ", "КАК ОТКАТИТЬ"

## 6) Чек-лист проверки перед коммитом
- UI загружается без зависаний
- `GET /api/whatsapp/status/:companyId` отвечает 200 с корректной структурой
- Инициализация (`POST /initialize`) возвращает success
- QR (если требуется) выдаётся и обновляется
- Отправка сообщения (`POST /send`) возвращает success, messageId
- Отключение (`DELETE /disconnect`) возвращает success
- Логи чистые (нет необработанных исключений)

## 7) Документация
- Обновить `ACTION_LOG.md` (что и почему изменили)
- Обновить `БЫСТРЫЙ_ЗАПУСК.md` (как поднять интеграции в dev)
- Внести в этот план ссылку на рабочие хэши и краткий итог выполненных шагов

---

Далее: переносим рабочие изменения WhatsApp из найденных коммитов (`c6321fd`, `033141d`) в ветку `feature/whatsapp-recovery-from-working`, запускаем dev-API и валидируем UI и эндпойнты по чек-листу.
