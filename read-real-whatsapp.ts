#!/usr/bin/env npx tsx

import { WhatsAppWebManager } from './services/integrations/whatsapp-web-manager.ts'
import { prisma } from './lib/prisma.ts'

async function readRealWhatsAppData() {
  console.log('📬 Чтение реальных данных из WhatsApp Web...\n')

  try {
    // Проверяем активные сессии WhatsAppWebManager
    const activeSessions = WhatsAppWebManager.getActiveSessionsStats()
    console.log('Активные сессии:', activeSessions)
    
    if (Object.keys(activeSessions).length === 0) {
      console.log('❌ Нет активных сессий WhatsAppWebManager')
      console.log('Запустите авторизацию через веб-интерфейс')
      return
    }

    // Находим активную интеграцию в БД
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { 
        status: 'CONNECTED'
      },
      orderBy: { lastCheckedAt: 'desc' }
    })

    if (!integration) {
      console.log('❌ Нет подключенных интеграций в базе данных')
      return
    }

    console.log('✅ Найдена интеграция:')
    console.log(`- ID: ${integration.id}`)
    console.log(`- Компания: ${integration.companyId}`)
    console.log(`- Статус: ${integration.status} (${integration.connectionStatus})`)
    console.log()

    // Получаем экземпляр менеджера
    const manager = WhatsAppWebManager.getInstance(integration.companyId)
    
    // Проверяем готовность
    const isAuthenticated = await manager.isAuthenticated()
    if (!isAuthenticated) {
      console.log('❌ WhatsApp Web не аутентифицирован')
      console.log('Попробуйте повторно авторизоваться')
      return
    }

    console.log('🔄 Получение данных из активной сессии WhatsApp Web...\n')

    // Пробуем получить информацию о сессии
    const sessionStats = manager.getSessionStats()
    console.log('📊 Статистика сессии:')
    console.log(`- Аутентифицирован: ${sessionStats.isAuthenticated}`)
    console.log(`- Браузер активен: ${sessionStats.hasBrowser}`)
    console.log(`- Страница загружена: ${sessionStats.hasPage}`)
    console.log()

    // Пробуем выполнить JavaScript в контексте WhatsApp Web
    console.log('🔍 Попытка извлечения чатов из DOM...')
    
    try {
      // Получаем чаты через DOM селекторы
      const chatsData = await manager.executeInWhatsAppContext(async (page) => {
        // Ждем загрузки чатов
        await page.waitForSelector('[data-testid="chat-list"]', { timeout: 10000 })
        
        // Извлекаем данные о чатах
        const chats = await page.evaluate(() => {
          const chatElements = document.querySelectorAll('[data-testid="cell-frame-container"]')
          const result = []
          
          for (let i = 0; i < Math.min(chatElements.length, 10); i++) {
            const chat = chatElements[i]
            
            try {
              const nameElement = chat.querySelector('[data-testid="conversation-info-header"]')
              const messageElement = chat.querySelector('[data-testid="last-msg-text"]')
              const timeElement = chat.querySelector('[data-testid="message-time"]')
              
              const name = nameElement?.textContent?.trim() || 'Неизвестно'
              const lastMessage = messageElement?.textContent?.trim() || ''
              const timestamp = timeElement?.textContent?.trim() || ''
              
              result.push({
                name,
                lastMessage: lastMessage.substring(0, 100),
                timestamp,
                platform: 'WhatsApp'
              })
            } catch (err) {
              console.log('Ошибка парсинга чата:', err)
            }
          }
          
          return result
        })
        
        return chats
      })
      
      if (chatsData && chatsData.length > 0) {
        console.log(`✅ Получено ${chatsData.length} чатов:\n`)
        
        chatsData.forEach((chat, index) => {
          console.log(`${index + 1}. ${chat.name}`)
          console.log(`   Последнее сообщение: ${chat.lastMessage || 'Нет сообщений'}`)
          console.log(`   Время: ${chat.timestamp}`)
          console.log()
        })
        
        // Возвращаем данные в формате JSON для API
        console.log('\n--- JSON OUTPUT ---')
        console.log(JSON.stringify({
          success: true,
          chats: chatsData,
          count: chatsData.length
        }))
        
      } else {
        console.log('📭 Чаты не найдены или не загрузились')
      }
      
    } catch (extractError) {
      console.error('❌ Ошибка извлечения данных из WhatsApp Web:', extractError)
      
      // Попробуем альтернативный метод - скриншот страницы для диагностики
      try {
        console.log('📸 Делаем скриншот страницы для диагностики...')
        await manager.executeInWhatsAppContext(async (page) => {
          await page.screenshot({ path: 'debug-whatsapp.png', fullPage: false })
        })
        console.log('📷 Скриншот сохранен в debug-whatsapp.png')
      } catch (screenshotError) {
        console.log('❌ Не удалось сделать скриншот:', screenshotError)
      }
    }

  } catch (error) {
    console.error('\n❌ Общая ошибка:', error)
    
    if (error instanceof Error) {
      console.error('- Сообщение:', error.message)
      if (error.stack) {
        console.error('- Стек:', error.stack.substring(0, 500))
      }
    }
  }
}

// Запускаем чтение
readRealWhatsAppData().catch(console.error)
