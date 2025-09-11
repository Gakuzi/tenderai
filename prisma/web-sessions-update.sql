-- Обновление схемы для веб-сессий

-- Обновляем TelegramIntegration для хранения веб-сессий вместо bot token
-- Переименовываем поля для ясности
-- botToken -> encryptedWebSession
-- webAppUrl -> webSessionUrl  
-- botUsername -> sessionUsername
-- botName -> displayName

-- Обновляем WhatsAppIntegration
-- accessToken -> encryptedWebSession
-- phoneNumberId -> sessionId
-- businessAccountId можно оставить для совместимости

-- Добавляем новые поля для хранения QR-кодов во время подключения
-- qrCodeData, qrCodeExpiresAt, connectionStatus
