#!/usr/bin/env npx tsx

import { WhatsAppReadyManager } from './services/integrations/whatsapp-ready-manager.ts'
import { prisma } from './lib/prisma.ts'

async function readWhatsAppMessages() {
  console.log('📬 Чтение реальных сообщений WhatsApp...\n')

  try {
    // Находим активную интеграцию
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { 
        status: 'CONNECTED',
        connectionStatus: 'connected'
      },
      orderBy: { lastCheckedAt: 'desc' }
    })

    if (!integration) {
      console.log('❌ Нет подключенных интеграций WhatsApp')
      console.log('Сначала авторизуйтесь через веб-интерфейс: http://localhost:3001')
      return
    }

    console.log('✅ Найдена интеграция:')
    console.log(`- ID: ${integration.id}`)
    console.log(`- Компания: ${integration.companyId}`)
    console.log(`- Статус: ${integration.status} (${integration.connectionStatus})`)
    console.log(`- Имя: ${integration.displayName}`)
    console.log()

    // Получаем менеджер
    const manager = WhatsAppReadyManager.getInstance(integration.companyId)
    
    // Проверяем готовность
    const isReady = await manager.isConnected()
    if (!isReady) {
      console.log('❌ WhatsApp клиент не готов')
      console.log('Попробуйте повторно авторизоваться через веб-интерфейс')
      return
    }

    console.log('🔄 Клиент готов, читаем сообщения...\n')

    // Читаем последние сообщения
    const messages = await manager.getRecentMessages(15)
    
    if (messages.length === 0) {
      console.log('📭 Нет доступных сообщений')
      return
    }

    console.log(`\n📬 Последние ${messages.length} сообщений:\n`)
    console.log('='.repeat(80))
    
    messages.forEach((msg, index) => {
      const time = new Date(msg.timestamp).toLocaleString()
      const direction = msg.isFromMe ? '➡️ Исходящее' : '⬅️ Входящее'
      const chatName = msg.chatName || 'Неизвестный контакт'
      
      console.log(`${index + 1}. ${direction}`)
      console.log(`   Чат: ${chatName}`)
      console.log(`   Время: ${time}`)
      console.log(`   Сообщение: ${msg.body || '[медиа-файл]'}`)
      console.log(`   Тип: ${msg.type}${msg.hasMedia ? ' (есть медиа)' : ''}`)
      console.log('-'.repeat(60))
    })

    // Также выводим список чатов
    console.log('\n📂 Список активных чатов:\n')
    const chats = await manager.getChatsList()
    
    chats.slice(0, 10).forEach((chat, index) => {
      const lastMsgTime = chat.lastMessage ? 
        new Date(chat.lastMessage.timestamp).toLocaleString() : 'Нет сообщений'
      const lastMsgText = chat.lastMessage ? 
        chat.lastMessage.body.substring(0, 50) + (chat.lastMessage.body.length > 50 ? '...' : '') : ''
      const unread = chat.unreadCount > 0 ? ` (${chat.unreadCount} непрочитанных)` : ''
      
      console.log(`${index + 1}. ${chat.name}${unread}`)
      console.log(`   ${chat.isGroup ? '👥 Группа' : '👤 Личный чат'}`)
      console.log(`   Последнее: ${lastMsgTime}`)
      if (lastMsgText) {
        console.log(`   "${lastMsgText}"`)
      }
      console.log()
    })

  } catch (error) {
    console.error('\n❌ Ошибка чтения сообщений:', error)
    
    if (error instanceof Error) {
      console.error('- Сообщение:', error.message)
      if (error.stack) {
        console.error('- Стек:', error.stack.substring(0, 500))
      }
    }
  }
}

// Запускаем чтение
readWhatsAppMessages().catch(console.error)
