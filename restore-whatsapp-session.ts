#!/usr/bin/env npx tsx

import { WhatsAppReadyManager } from './services/integrations/whatsapp-ready-manager.ts'
import { prisma } from './lib/prisma.ts'

async function restoreWhatsAppSession() {
  console.log('🔄 Восстановление долгоживущей сессии WhatsApp из базы данных...\n')

  try {
    // Находим последнюю успешную интеграцию
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { 
        status: 'CONNECTED'
      },
      orderBy: { lastCheckedAt: 'desc' }
    })

    if (!integration) {
      console.log('❌ Нет сохраненных интеграций для восстановления')
      return false
    }

    console.log('✅ Найдена интеграция для восстановления:')
    console.log(`- ID: ${integration.id}`)
    console.log(`- Компания: ${integration.companyId}`)
    console.log(`- Статус: ${integration.status} (${integration.connectionStatus})`)
    console.log(`- Последняя активность: ${integration.lastCheckedAt}`)
    console.log()

    // Проверяем, есть ли уже активная сессия
    const existingStats = WhatsAppReadyManager.getActiveInstances()
    if (existingStats[integration.companyId]) {
      console.log('ℹ️ Сессия уже активна, проверяем состояние...')
      
      const manager = WhatsAppReadyManager.getInstance(integration.companyId)
      const isConnected = await manager.isConnected()
      
      if (isConnected) {
        console.log('✅ Сессия активна и готова к работе!')
        return true
      } else {
        console.log('⚠️ Сессия существует, но не подключена. Перезапускаем...')
        await WhatsAppReadyManager.destroyInstance(integration.companyId)
      }
    }

    // Создаем новый экземпляр менеджера
    console.log('🚀 Создаем новый экземпляр WhatsAppReadyManager...')
    const manager = WhatsAppReadyManager.getInstance(integration.companyId)

    // Инициализируем с существующей интеграцией
    console.log('🔧 Инициализация с сохраненной сессией...')
    await manager.initialize(integration.id)

    // Запускаем клиент (он должен восстановить сессию из LocalAuth)
    console.log('▶️ Запуск клиента (LocalAuth должен восстановить сессию)...')
    
    // Запускаем в фоне
    const startPromise = manager.start()
    
    // Ждем готовности максимум 60 секунд
    console.log('⏳ Ожидаем восстановления сессии (до 60 секунд)...\n')
    
    let attempts = 0
    const maxAttempts = 60
    let connected = false
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
      
      try {
        const isReady = await manager.isConnected()
        if (isReady) {
          connected = true
          console.log('\n✅ Сессия успешно восстановлена!')
          break
        }
      } catch (e) {
        // Игнорируем ошибки проверки во время инициализации
      }
      
      // Показываем прогресс каждые 10 секунд
      if (attempts % 10 === 0) {
        console.log(`⏳ Ожидание восстановления... ${attempts}/${maxAttempts} сек`)
        
        // Обновляем статус в базе
        const currentStats = WhatsAppReadyManager.getActiveInstances()
        console.log(`📊 Статус: ${JSON.stringify(currentStats[integration.companyId] || 'не найден')}`)
      }
    }
    
    if (connected) {
      // Проверяем информацию о клиенте
      try {
        const clientInfo = await manager.getClientInfo()
        if (clientInfo) {
          console.log('\n📱 Информация о клиенте:')
          console.log(`- Имя: ${clientInfo.pushname}`)
          console.log(`- Номер: ${clientInfo.wid.user}`)
          
          // Обновляем данные в базе
          await prisma.whatsAppIntegration.update({
            where: { id: integration.id },
            data: {
              displayName: clientInfo.pushname || 'WhatsApp User',
              phoneNumber: clientInfo.wid.user,
              connectionStatus: 'connected',
              lastCheckedAt: new Date()
            }
          })
        }
      } catch (e) {
        console.log('⚠️ Не удалось получить информацию о клиенте:', e.message)
      }
      
      console.log('\n🎉 Долгоживущая сессия WhatsApp готова к работе!')
      console.log('Теперь можно использовать чтение сообщений и отправку без повторной авторизации')
      return true
      
    } else {
      console.log('\n❌ Не удалось восстановить сессию за отведенное время')
      console.log('Возможно, требуется новая авторизация через QR-код')
      
      // Проверяем, нужен ли QR-код
      const currentIntegration = await prisma.whatsAppIntegration.findUnique({
        where: { id: integration.id }
      })
      
      if (currentIntegration?.qrCodeData) {
        console.log('📱 QR-код готов - откройте веб-интерфейс для сканирования')
      }
      
      return false
    }

  } catch (error) {
    console.error('\n❌ Ошибка восстановления сессии:', error)
    
    if (error instanceof Error) {
      console.error('- Сообщение:', error.message)
    }
    
    return false
  }
}

// Запускаем восстановление
restoreWhatsAppSession().then(success => {
  if (success) {
    console.log('\n✅ Процесс завершен успешно')
  } else {
    console.log('\n❌ Процесс завершен с ошибками')
  }
}).catch(console.error)
