import { prisma } from './lib/prisma'
import { IntegrationType } from '@prisma/client'
import { integrationManagerExtended } from './services/integrations/integration-manager'

const TEST_PHONE = '+79214962555' // Тестовый номер

async function checkIntegrationStatus() {
  console.log('🔍 Проверка состояния интеграций\n')
  
  try {
    // Получаем компанию
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Компания не найдена')
      return
    }
    
    console.log(`📊 Компания: ${company.name} (ID: ${company.id})\n`)
    
    // Проверяем WhatsApp интеграции
    console.log('📱 WhatsApp интеграции:')
    const whatsappIntegrations = await prisma.whatsAppIntegration.findMany({
      where: { companyId: company.id }
    })
    
    if (whatsappIntegrations.length === 0) {
      console.log('❌ WhatsApp интеграций не найдено')
    } else {
      for (const integration of whatsappIntegrations) {
        console.log(`- ID: ${integration.id}`)
        console.log(`  Статус: ${integration.status}`)
        console.log(`  Connection Status: ${integration.connectionStatus || 'не установлен'}`)
        console.log(`  Display Name: ${integration.displayName || 'не установлено'}`)
        console.log(`  Phone: ${integration.phoneNumber || 'не установлен'}`)
        console.log(`  Сессия сохранена: ${integration.encryptedWebSession ? '✅' : '❌'}`)
        console.log(`  Последняя проверка: ${integration.lastCheckedAt || 'никогда'}`)
        console.log(`  Отправлено сообщений: ${integration.messagesSent}`)
        console.log(`  Ошибка: ${integration.lastError || 'нет'}`)
        
        // Проверим статус через Integration Manager
        if (integration.status === 'CONNECTED') {
          try {
            const status = await integrationManagerExtended.getIntegrationStatus(
              integration.id, 
              IntegrationType.WHATSAPP
            )
            console.log(`  Проверка через Manager: ${status.status}`)
          } catch (error) {
            console.log(`  Ошибка проверки: ${error}`)
          }
        }
        console.log('')
      }
    }
    
    // Проверяем Telegram интеграции
    console.log('💬 Telegram интеграции:')
    const telegramIntegrations = await prisma.telegramIntegration.findMany({
      where: { companyId: company.id }
    })
    
    if (telegramIntegrations.length === 0) {
      console.log('❌ Telegram интеграций не найдено')
    } else {
      for (const integration of telegramIntegrations) {
        console.log(`- ID: ${integration.id}`)
        console.log(`  Статус: ${integration.status}`)
        console.log(`  Connection Status: ${integration.connectionStatus || 'не установлен'}`)
        console.log(`  Display Name: ${integration.displayName || 'не установлено'}`)
        console.log(`  Username: ${integration.sessionUsername || 'не установлен'}`)
        console.log(`  Сессия сохранена: ${integration.encryptedWebSession ? '✅' : '❌'}`)
        console.log(`  Последняя проверка: ${integration.lastCheckedAt || 'никогда'}`)
        console.log(`  Отправлено сообщений: ${integration.messagesSent}`)
        console.log(`  Ошибка: ${integration.lastError || 'нет'}`)
        
        // Проверим статус через Integration Manager
        if (integration.status === 'CONNECTED') {
          try {
            const status = await integrationManagerExtended.getIntegrationStatus(
              integration.id, 
              IntegrationType.TELEGRAM
            )
            console.log(`  Проверка через Manager: ${status.status}`)
          } catch (error) {
            console.log(`  Ошибка проверки: ${error}`)
          }
        }
        console.log('')
      }
    }
    
    // Последние логи интеграций
    console.log('📝 Последние логи интеграций:')
    const logs = await prisma.integrationLog.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    if (logs.length === 0) {
      console.log('❌ Логов не найдено')
    } else {
      for (const log of logs) {
        console.log(`- ${log.createdAt.toLocaleString()} [${log.integrationType}] ${log.action}: ${log.status}`)
        if (log.message) console.log(`  Сообщение: ${log.message}`)
        if (log.status === 'ERROR' && log.errorDetails) {
          console.log(`  Ошибка: ${JSON.stringify(log.errorDetails)}`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке интеграций:', error)
  }
}

async function testMessageSending() {
  console.log('\n🧪 Тест отправки сообщений\n')
  
  try {
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Компания не найдена')
      return
    }
    
    // Тест WhatsApp
    const whatsappIntegration = await prisma.whatsAppIntegration.findFirst({
      where: { 
        companyId: company.id,
        status: 'CONNECTED'
      }
    })
    
    if (whatsappIntegration) {
      console.log(`📱 Тестируем отправку WhatsApp сообщения на ${TEST_PHONE}...`)
      
      const testMessage = `🤖 Тест из TenderAI WhatsApp!\nВремя: ${new Date().toLocaleString()}\nIntegration ID: ${whatsappIntegration.id.slice(-8)}`
      
      const result = await integrationManagerExtended.sendMessage(
        whatsappIntegration.id,
        IntegrationType.WHATSAPP,
        TEST_PHONE,
        testMessage
      )
      
      if (result.success) {
        console.log('✅ WhatsApp сообщение отправлено успешно!')
      } else {
        console.log('❌ Ошибка отправки WhatsApp сообщения:', result.error)
      }
    } else {
      console.log('❌ Активная WhatsApp интеграция не найдена')
    }
    
    // Тест Telegram
    const telegramIntegration = await prisma.telegramIntegration.findFirst({
      where: { 
        companyId: company.id,
        status: 'CONNECTED'
      }
    })
    
    if (telegramIntegration) {
      console.log(`💬 Тестируем отправку Telegram сообщения...`)
      
      const testMessage = `🤖 Тест из TenderAI Telegram!\nВремя: ${new Date().toLocaleString()}\nIntegration ID: ${telegramIntegration.id.slice(-8)}`
      
      const result = await integrationManagerExtended.sendMessage(
        telegramIntegration.id,
        IntegrationType.TELEGRAM,
        'test_user', // Для Telegram нужен username или chat_id
        testMessage
      )
      
      if (result.success) {
        console.log('✅ Telegram сообщение отправлено успешно!')
      } else {
        console.log('❌ Ошибка отправки Telegram сообщения:', result.error)
      }
    } else {
      console.log('❌ Активная Telegram интеграция не найдена')
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании отправки:', error)
  }
}

async function main() {
  console.log('🔧 TenderAI - Диагностика интеграций мессенджеров\n')
  console.log('=' .repeat(60) + '\n')
  
  await checkIntegrationStatus()
  
  console.log('\n' + '=' .repeat(60))
  
  // Спрашиваем пользователя, хочет ли он протестировать отправку
  console.log('\n💡 Хотите протестировать отправку сообщений?')
  console.log('   (Нажмите Ctrl+C для отмены или подождите 5 секунд для автотеста)\n')
  
  // Ждем 5 секунд, затем запускаем тест
  setTimeout(async () => {
    await testMessageSending()
    process.exit(0)
  }, 5000)
  
  // Обработчик для Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n🛑 Тест отменен пользователем')
    process.exit(0)
  })
}

main().catch(console.error)
