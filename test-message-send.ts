import { integrationManagerExtended } from './services/integrations/integration-manager'
import { IntegrationType } from '@prisma/client'
import { prisma } from './lib/prisma'

const TEST_PHONE = '+79214962555'

async function testMessageSending() {
  console.log('📱 Тест отправки сообщения через авторизованную интеграцию WhatsApp\n')

  try {
    // Найдем активную WhatsApp интеграцию
    const whatsappIntegration = await prisma.whatsAppIntegration.findFirst({
      where: {
        status: 'CONNECTED'
      },
      orderBy: { lastCheckedAt: 'desc' }
    })

    if (!whatsappIntegration) {
      console.log('❌ Активная WhatsApp интеграция не найдена')
      console.log('Запустите: npx tsx reauth-whatsapp.ts')
      return
    }

    console.log('✅ Найдена активная интеграция:')
    console.log(`- ID: ${whatsappIntegration.id}`)
    console.log(`- Статус: ${whatsappIntegration.status}`)
    console.log(`- Display Name: ${whatsappIntegration.displayName || 'не установлено'}`)
    console.log(`- Phone: ${whatsappIntegration.phoneNumber || 'не установлен'}`)
    console.log(`- Сессия: ${whatsappIntegration.encryptedWebSession ? '✅ сохранена' : '❌ отсутствует'}`)
    console.log(`- Последняя проверка: ${whatsappIntegration.lastCheckedAt?.toLocaleString() || 'никогда'}`)

    if (!whatsappIntegration.encryptedWebSession) {
      console.log('❌ Сессия не сохранена - требуется повторная авторизация')
      return
    }

    console.log(`\n📤 Отправляем тестовое сообщение на ${TEST_PHONE}...`)
    
    const testMessage = `🤖 Тест из TenderAI WhatsApp!
Время: ${new Date().toLocaleString()}
Integration ID: ${whatsappIntegration.id.slice(-8)}
Статус: Отправка через сохраненную сессию ✅

Это автоматическое тестовое сообщение от системы TenderAI.`

    const result = await integrationManagerExtended.sendMessage(
      whatsappIntegration.id,
      IntegrationType.WHATSAPP,
      TEST_PHONE,
      testMessage
    )

    if (result.success) {
      console.log('\n✅ Сообщение отправлено успешно!')
      console.log(`- Message ID: ${result.messageId}`)
      console.log(`- Время отправки: ${result.timestamp.toLocaleString()}`)
      
      // Проверяем обновленную статистику
      const updatedIntegration = await prisma.whatsAppIntegration.findUnique({
        where: { id: whatsappIntegration.id }
      })
      
      if (updatedIntegration) {
        console.log(`- Всего отправлено сообщений: ${updatedIntegration.messagesSent}`)
      }
    } else {
      console.log('\n❌ Ошибка отправки сообщения:')
      console.log(`- Ошибка: ${result.error}`)
      console.log(`- Время: ${result.timestamp.toLocaleString()}`)
    }

  } catch (error) {
    console.error('\n❌ Произошла ошибка:', error)
  }
}

testMessageSending().catch(console.error)
