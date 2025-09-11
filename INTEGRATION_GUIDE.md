# 📱 Система интеграций TenderAI через веб-сессии

## 🎯 Концепция

Вместо использования Bot API, наша система создает и управляет реальными веб-сессиями:
- **Telegram Web** - как в web.telegram.org
- **WhatsApp Web** - как в web.whatsapp.com  
- **Площадки закупок** - авторизация через puppeteer

## 🏗 Архитектура

### Базовые компоненты:

1. **WebSessionManager** - абстрактный базовый класс
2. **TelegramWebManager** - управление Telegram Web сессиями
3. **WhatsAppWebManager** - управление WhatsApp Web сессиями  
4. **IntegrationManager** - единый API для всех интеграций

### База данных:
- **telegram_integrations** - сессии Telegram Web
- **whatsapp_integrations** - сессии WhatsApp Web
- **platform_integrations** - сессии площадок закупок
- **integration_logs** - логи всех действий

## 🔐 Безопасность

- Все веб-сессии шифруются AES через `lib/encryption.ts`
- Cookies, localStorage, sessionStorage сохраняются зашифрованно
- QR-коды временные (5 минут TTL)
- Автоматическое логирование всех действий

## 🚀 Процесс подключения

### Шаг 1: Генерация QR-кода
```typescript
const response = await integrationManager.initializeQRAuth({
  companyId: 'company_id',
  integrationType: 'WHATSAPP' // or 'TELEGRAM'
})
// response.qrCode - base64 изображение QR-кода
```

### Шаг 2: Показ QR-кода пользователю
Пользователь сканирует QR-код телефоном:
- **WhatsApp**: сканирует через WhatsApp → "Связанные устройства"
- **Telegram**: сканирует через Telegram → Settings → Devices

### Шаг 3: Ожидание авторизации
```typescript
const success = await integrationManager.waitForQRAuth(
  response.integrationId, 
  'WHATSAPP'
)
```

### Шаг 4: Сохранение сессии
После успешной авторизации:
- Сессия автоматически сохраняется зашифрованно
- Статус обновляется на CONNECTED
- Веб-браузер закрывается
- Сессия готова для использования агентами

## 📊 Управление сессиями

### Проверка статуса:
```typescript
const status = await integrationManager.getIntegrationStatus(
  integrationId, 
  'TELEGRAM'
)
```

### Список всех интеграций компании:
```typescript
const integrations = await integrationManager.getCompanyIntegrations(companyId)
```

### Отключение:
```typescript
await integrationManager.disconnectIntegration(integrationId, 'WHATSAPP')
```

## 🤖 Использование агентами

После установки сессий, AI агенты могут:
1. Восстановить веб-сессию из зашифрованного хранилища
2. Открыть браузер с сохраненными cookies/localStorage  
3. Отправлять сообщения через веб-интерфейс
4. Читать входящие сообщения
5. Управлять контактами и группами

## 📱 UI Интерфейс

В админке клиента будет:
- Список подключенных интеграций с статусами
- Кнопки "Подключить Telegram Web / WhatsApp Web"
- QR-код сканер с live preview
- Индикаторы активности сессий
- Логи подключений и ошибок

## ⚡ Преимущества

✅ **Реальные пользовательские аккаунты** - не боты  
✅ **Полный доступ к функциям** - как у обычного пользователя  
✅ **Обход ограничений Bot API** - нет лимитов на группы/каналы  
✅ **Персонализация** - сообщения от имени реального пользователя  
✅ **Надежность** - сессии живут неделями  

## 🔄 Мониторинг и восстановление

- Автоматическая проверка активности сессий каждый час
- При обнаружении разрыва - попытка восстановления  
- Если восстановление невозможно - генерация нового QR-кода
- Email/SMS уведомления о потере сессий

## 🎯 Следующие шаги

1. ✅ WhatsApp Web QR-авторизация  
2. ✅ Telegram Web QR-авторизация
3. ⏳ UI для QR-сканирования
4. ⏳ Отправка сообщений через сессии
5. ⏳ Площадки закупок (zakupki.gov.ru)
6. ⏳ Система мониторинга
7. ⏳ Email интеграции
