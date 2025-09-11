import { prisma } from './lib/prisma'
import { integrationManagerExtended } from './services/integrations/integration-manager'
import { IntegrationType } from '@prisma/client'

async function checkSessionStatus() {
  console.log('🔍 Проверка статуса сессий\n')
  
  // Проверяем WhatsApp интеграции
  const whatsappIntegrations = await prisma.whatsAppIntegration.findMany({
    where: {
      status: 'CONNECTED'
    }
  })

  console.log(`Найдено ${whatsappIntegrations.length} активных WhatsApp интеграций`)
  
  for (const integration of whatsappIntegrations) {
    console.log(`\n📱 Проверяем интеграцию ${integration.id.slice(-8)}...`)
    console.log(`- Статус в БД: ${integration.status}`)
    console.log(`- Display Name: ${integration.displayName}`)
    console.log(`- Последняя проверка: ${integration.lastCheckedAt?.toLocaleString()}`)
    console.log(`- Сессия сохранена: ${integration.encryptedWebSession ? 'да' : 'нет'}`)
    
    if (integration.encryptedWebSession) {
      // Попробуем проверить актуальность сессии
      try {
        const testResult = await integrationManagerExtended.sendMessage(
          integration.id,
          IntegrationType.WHATSAPP,
          '+79214962555',
          '🔍 Тест проверки сессии'
        )
        
        if (testResult.success) {
          console.log('✅ Сессия активна - сообщение отправлено')
        } else {
          console.log('❌ Сессия неактивна:', testResult.error)
          
          // Обновляем статус в БД
          await prisma.whatsAppIntegration.update({
            where: { id: integration.id },
            data: {
              status: 'DISCONNECTED',
              lastError: 'Session expired',
              connectionStatus: 'expired'
            }
          })
          console.log('🔄 Статус обновлен на DISCONNECTED')
        }
      } catch (error) {
        console.log('❌ Ошибка проверки сессии:', error)
      }
    } else {
      console.log('⚠️  Сессия не сохранена - требуется авторизация')
    }
  }
  
  console.log('\n✅ Проверка завершена')
}

checkSessionStatus().catch(console.error)
