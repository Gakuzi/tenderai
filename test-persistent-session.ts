#!/usr/bin/env npx tsx

import { WhatsAppWebManager } from './services/integrations/whatsapp-web-manager'
import { IntegrationManager } from './services/integrations/integration-manager'
import { prisma } from './lib/prisma'
import { IntegrationType, IntegrationStatus } from '@prisma/client'

async function testPersistentSession() {
  console.log('🧪 Тест долгоживущей сессии WhatsApp\n')

  try {
    // 1. Получаем активную интеграцию
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: {
        status: IntegrationStatus.CONNECTED
      },
      orderBy: {
        lastCheckedAt: 'desc'
      }
    })

    if (!integration) {
      console.log('❌ Не найдена активная WhatsApp интеграция с CONNECTED статусом')
      return
    }

    console.log('✅ Найдена активная интеграция:')
    console.log(`- ID: ${integration.id}`)
    console.log(`- Статус: ${integration.status}`)
    console.log(`- Display Name: ${integration.displayName}`)
    console.log(`- Phone: ${integration.phoneNumber || 'не установлен'}`)
    console.log(`- Сессия: ${integration.encryptedWebSession ? '✅ сохранена' : '❌ отсутствует'}`)
    console.log(`- Последняя проверка: ${integration.lastCheckedAt?.toLocaleString()}`)
    console.log()

    // 2. Тестируем отправку сообщения
    const testPhone = '+79214962555' // Тестовый номер
    const testMessage = `🤖 Тест долгоживущей сессии WhatsApp!
Время: ${new Date().toLocaleString()}
Integration ID: ${integration.id.slice(-8)}
Статус: Использование существующей сессии ✅

Это автоматическое тестовое сообщение от системы TenderAI.`

    console.log(`📤 Отправляем сообщение на ${testPhone}...`)
    console.log(`💬 Текст: ${testMessage.split('\n')[0]}...`)
    console.log()

    // Используем IntegrationManager для отправки
    const integrationManager = new IntegrationManager(integration.companyId)
    const success = await integrationManager.sendMessage(
      IntegrationType.WHATSAPP,
      integration.id,
      testPhone,
      testMessage
    )

    if (success) {
      console.log('✅ Сообщение успешно отправлено!')
      
      // Проверяем обновление статистики
      const updatedIntegration = await prisma.whatsAppIntegration.findUnique({
        where: { id: integration.id }
      })
      
      if (updatedIntegration) {
        console.log(`📊 Статистика обновлена:`)
        console.log(`- Отправлено сообщений: ${updatedIntegration.messagesSent}`)
        console.log(`- Последняя проверка: ${updatedIntegration.lastCheckedAt?.toLocaleString()}`)
      }
    } else {
      console.log('❌ Ошибка отправки сообщения')
    }

    // 3. Проверяем статус сессии после отправки
    console.log('\n🔍 Проверяем состояние сессии после отправки...')
    const finalIntegration = await prisma.whatsAppIntegration.findUnique({
      where: { id: integration.id }
    })
    
    if (finalIntegration) {
      console.log(`- Статус: ${finalIntegration.status}`)
      console.log(`- Connection Status: ${finalIntegration.connectionStatus}`)
      console.log(`- Последняя ошибка: ${finalIntegration.lastError || 'нет'}`)
    }

    // 4. Показываем статистику активных сессий
    const sessionStats = WhatsAppWebManager.getActiveSessionsStats()
    console.log('\n📈 Статистика активных сессий:')
    for (const [companyId, stats] of Object.entries(sessionStats)) {
      console.log(`- Компания ${companyId}:`)
      console.log(`  - Авторизована: ${stats.isAuthenticated ? '✅' : '❌'}`)
      console.log(`  - Браузер: ${stats.hasBrowser ? '✅' : '❌'}`)
      console.log(`  - Страница: ${stats.hasPage ? '✅' : '❌'}`)
    }

  } catch (error) {
    console.error('\n❌ Ошибка теста:', error)
    
    if (error instanceof Error) {
      console.error('- Сообщение:', error.message)
      console.error('- Стек:', error.stack)
    }
  }
}

// Запускаем тест
testPersistentSession().catch(console.error)
