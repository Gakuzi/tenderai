#!/usr/bin/env npx tsx

import { WhatsAppReadyManager } from './services/integrations/whatsapp-ready-manager.ts'
import { prisma } from './lib/prisma.ts'
import { IntegrationStatus } from '@prisma/client'

async function authWhatsAppPersistent() {
  console.log('🔄 Авторизация WhatsApp с постоянной сессией (БЕЗ ЗАКРЫТИЯ!)\n')
  
  const companyId = 'cmffv19vr0004u8459d4zx9vr' // ID компании
  
  try {
    // Проверяем, есть ли уже активная сессия
    const existingStats = WhatsAppReadyManager.getActiveInstances()
    console.log('Текущие активные сессии:', existingStats)
    
    if (existingStats[companyId]) {
      console.log('ℹ️ Сессия уже существует, проверяем состояние...')
      
      const existingManager = WhatsAppReadyManager.getInstance(companyId)
      const isConnected = await existingManager.isConnected()
      
      if (isConnected) {
        console.log('✅ Сессия уже активна и готова!')
        
        // Тестируем отправку сообщения
        await testMessage(existingManager, companyId)
        return true
      } else {
        console.log('⚠️ Сессия существует, но не подключена. Переавторизация...')
        await WhatsAppReadyManager.destroyInstance(companyId)
      }
    }
    
    // Создаем новую интеграцию в базе
    console.log('1️⃣ Создаем новую интеграцию в базе данных...')
    const integration = await prisma.whatsAppIntegration.create({
      data: {
        companyId,
        connectionStatus: 'initializing',
        status: IntegrationStatus.CONNECTING
      }
    })
    
    console.log(`✅ Интеграция создана: ${integration.id}`)
    
    // Создаем менеджер
    console.log('2️⃣ Создаем WhatsAppReadyManager...')
    const manager = WhatsAppReadyManager.getInstance(companyId)
    
    // Инициализируем
    await manager.initialize(integration.id)
    
    console.log('3️⃣ Запускаем авторизацию (генерируется QR-код)...')
    console.log('📱 Откройте WhatsApp → Меню → Привязанные устройства → Привязать устройство')
    console.log('📸 Отсканируйте QR-код, который появится в веб-интерфейсе\n')
    
    // Запускаем клиент (НЕ ЖДЕМ завершения!)
    manager.start().catch(error => {
      console.error('❌ Ошибка запуска клиента:', error)
    })
    
    // Ждем авторизации максимум 5 минут
    console.log('⏳ Ожидаем авторизацию (максимум 5 минут)...\n')
    
    let attempts = 0
    const maxAttempts = 300 // 5 минут
    let connected = false
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
      
      try {
        const isReady = await manager.isConnected()
        if (isReady) {
          connected = true
          console.log('\n🎉 Авторизация успешна!')
          break
        }
      } catch (e) {
        // Игнорируем ошибки во время авторизации
      }
      
      // Показываем прогресс каждые 15 секунд
      if (attempts % 15 === 0) {
        console.log(`⏳ Ожидание... ${attempts}/${maxAttempts} сек`)
        
        // Проверяем статус в базе
        const currentIntegration = await prisma.whatsAppIntegration.findUnique({
          where: { id: integration.id }
        })
        
        if (currentIntegration) {
          console.log(`📊 Статус в БД: ${currentIntegration.status} (${currentIntegration.connectionStatus})`)
          
          if (currentIntegration.qrCodeData) {
            console.log('📱 QR-код готов в веб-интерфейсе: http://localhost:3001')
          }
        }
      }
    }
    
    if (connected) {
      // Получаем информацию о клиенте
      try {
        const clientInfo = await manager.getClientInfo()
        if (clientInfo) {
          console.log('\n📱 Информация о подключенном аккаунте:')
          console.log(`- Имя: ${clientInfo.pushname || 'Не указано'}`)
          console.log(`- Номер: ${clientInfo.wid.user}`)
          
          // Обновляем в базе
          await prisma.whatsAppIntegration.update({
            where: { id: integration.id },
            data: {
              displayName: clientInfo.pushname || 'WhatsApp User',
              phoneNumber: clientInfo.wid.user,
              connectionStatus: 'connected',
              status: IntegrationStatus.CONNECTED,
              lastCheckedAt: new Date()
            }
          })
        }
      } catch (e) {
        console.log('⚠️ Не удалось получить информацию о клиенте:', e)
      }
      
      console.log('\n✅ АВТОРИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО!')
      console.log('🔥 ВАЖНО: Сессия остается активной и НЕ закрывается!')
      console.log('💪 Теперь можно отправлять сообщения и читать чаты')
      
      // Проверяем статистику
      const finalStats = WhatsAppReadyManager.getActiveInstances()
      console.log('\n📊 Статистика активных сессий:', finalStats)
      
      // Тестируем отправку сообщения
      await testMessage(manager, companyId, integration.id)
      
      return true
      
    } else {
      console.log('\n❌ Авторизация не завершилась за отведенное время')
      
      // Проверяем последний статус
      const finalIntegration = await prisma.whatsAppIntegration.findUnique({
        where: { id: integration.id }
      })
      
      if (finalIntegration) {
        console.log(`📊 Финальный статус: ${finalIntegration.status} (${finalIntegration.connectionStatus})`)
        if (finalIntegration.qrCodeData) {
          console.log('📱 QR-код все еще доступен в веб-интерфейсе')
        }
      }
      
      return false
    }
    
  } catch (error) {
    console.error('\n❌ Ошибка авторизации:', error)
    
    if (error instanceof Error) {
      console.error('- Сообщение:', error.message)
    }
    
    return false
  }
}

async function testMessage(manager: WhatsAppReadyManager, companyId: string, integrationId?: string) {
  console.log('\n4️⃣ Тестируем отправку сообщения...')
  
  const testMessage = `🚀 Тест постоянной сессии WhatsApp!

⏰ Время: ${new Date().toLocaleString()}
🏢 Компания: ${companyId.slice(-8)}
${integrationId ? `🔗 Integration: ${integrationId.slice(-8)}` : ''}

✅ Сессия НЕ закрывается после авторизации!
💪 Можно использовать для отправки и чтения сообщений`

  try {
    const success = await manager.sendMessage('+79214962555', testMessage)
    
    if (success) {
      console.log('✅ Тестовое сообщение отправлено успешно!')
    } else {
      console.log('❌ Ошибка отправки тестового сообщения')
    }
  } catch (error) {
    console.log('❌ Ошибка отправки сообщения:', error)
  }
}

// Запускаем авторизацию
authWhatsAppPersistent().then(success => {
  if (success) {
    console.log('\n🎉 ПРОЦЕСС ЗАВЕРШЕН УСПЕШНО!')
    console.log('🔥 Сессия WhatsApp остается активной для дальнейшего использования')
    console.log('📱 Теперь можно использовать чтение сообщений и отправку')
  } else {
    console.log('\n❌ Процесс завершен с ошибками')
  }
}).catch(console.error)
