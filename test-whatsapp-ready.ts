#!/usr/bin/env npx tsx

import { WhatsAppReadyManager } from './services/integrations/whatsapp-ready-manager.ts'
import { prisma } from './lib/prisma.ts'
import { IntegrationStatus } from '@prisma/client'

async function testWhatsAppReady() {
  console.log('🧪 Тест готовой библиотеки WhatsApp Web.js\n')

  try {
    // Получаем интеграцию или создаем новую
    let integration = await prisma.whatsAppIntegration.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!integration) {
      console.log('📝 Создаем новую интеграцию WhatsApp...')
      integration = await prisma.whatsAppIntegration.create({
        data: {
          companyId: 'test-company-ready',
          status: IntegrationStatus.CREATED,
          connectionStatus: 'initializing'
        }
      })
    }

    console.log('✅ Используем интеграцию:')
    console.log(`- ID: ${integration.id}`)
    console.log(`- Компания: ${integration.companyId}`)
    console.log(`- Статус: ${integration.status}`)
    console.log()

    // Получаем менеджер
    const manager = WhatsAppReadyManager.getInstance(integration.companyId)
    
    console.log('🚀 Инициализируем WhatsApp клиент...')
    await manager.initialize(integration.id)
    
    console.log('🔄 Запускаем клиент (это может занять некоторое время)...')
    
    // Запускаем клиент в фоне
    manager.start().catch(error => {
      console.error('❌ Ошибка запуска клиента:', error)
    })

    // Ждем некоторое время для инициализации
    console.log('⏳ Ждем инициализацию клиента (30 сек)...')
    
    let attempts = 0
    const maxAttempts = 30 // 30 секунд
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
      
      const isReady = await manager.isConnected()
      if (isReady) {
        console.log('✅ WhatsApp клиент готов!')
        break
      }
      
      // Показываем прогресс каждые 5 секунд
      if (attempts % 5 === 0) {
        console.log(`⏳ Ожидание... ${attempts}/${maxAttempts} сек`)
        
        // Проверяем статус в базе
        const currentIntegration = await prisma.whatsAppIntegration.findUnique({
          where: { id: integration.id }
        })
        
        if (currentIntegration) {
          console.log(`📊 Текущий статус: ${currentIntegration.status} (${currentIntegration.connectionStatus})`)
          
          if (currentIntegration.qrCodeData) {
            console.log('📱 QR код доступен для сканирования в веб-интерфейсе')
          }
        }
      }
    }
    
    // Проверяем финальный статус
    const finalIntegration = await prisma.whatsAppIntegration.findUnique({
      where: { id: integration.id }
    })
    
    if (finalIntegration) {
      console.log('\n📊 Финальный статус:')
      console.log(`- Статус: ${finalIntegration.status}`)
      console.log(`- Connection Status: ${finalIntegration.connectionStatus}`)
      console.log(`- Display Name: ${finalIntegration.displayName || 'не установлен'}`)
      console.log(`- Phone: ${finalIntegration.phoneNumber || 'не установлен'}`)
      console.log(`- Последняя ошибка: ${finalIntegration.lastError || 'нет'}`)
      
      if (finalIntegration.qrCodeData && finalIntegration.status === IntegrationStatus.AUTHENTICATING) {
        console.log('📱 QR код готов - откройте веб-интерфейс мониторинга для сканирования')
      }
    }

    // Если клиент готов, тестируем отправку сообщения
    const isReady = await manager.isConnected()
    if (isReady) {
      console.log('\n📤 Тестируем отправку сообщения...')
      
      const testMessage = `🤖 Тест готовой библиотеки WhatsApp Web.js!
Время: ${new Date().toLocaleString()}
Integration ID: ${integration.id.slice(-8)}

Это сообщение отправлено с помощью готовой библиотеки whatsapp-web.js`

      const success = await manager.sendMessage('+79214962555', testMessage)
      
      if (success) {
        console.log('✅ Тестовое сообщение отправлено успешно!')
        
        // Проверяем обновление статистики
        const updatedIntegration = await prisma.whatsAppIntegration.findUnique({
          where: { id: integration.id }
        })
        
        if (updatedIntegration) {
          console.log(`📊 Отправлено сообщений: ${updatedIntegration.messagesSent}`)
        }
      } else {
        console.log('❌ Ошибка отправки тестового сообщения')
      }
    } else {
      console.log('\n⚠️ Клиент не готов - требуется авторизация через QR код')
    }

    // Показываем статистику активных сессий
    const activeStats = WhatsAppReadyManager.getActiveInstances()
    console.log('\n📈 Активные экземпляры:')
    for (const [companyId, stats] of Object.entries(activeStats)) {
      console.log(`- ${companyId}: готов=${stats.isReady}, клиент=${stats.hasClient}`)
    }

  } catch (error) {
    console.error('\n❌ Ошибка теста:', error)
    
    if (error instanceof Error) {
      console.error('- Сообщение:', error.message)
      console.error('- Стек:', error.stack?.substring(0, 500))
    }
  } finally {
    console.log('\n🏁 Тест завершен. Клиент остается активным в фоне.')
    console.log('Для остановки используйте: WhatsAppReadyManager.destroyInstance(companyId)')
  }
}

// Запускаем тест
testWhatsAppReady().catch(console.error)
