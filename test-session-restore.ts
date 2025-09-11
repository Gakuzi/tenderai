import { WhatsAppWebManager } from './services/integrations/whatsapp-web-manager'
import { prisma } from './lib/prisma'

async function testSessionRestore() {
  console.log('🔍 Тест восстановления сессии WhatsApp\n')
  
  try {
    // Получаем последнюю сессию с данными
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { 
        encryptedWebSession: { not: null }
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    if (!integration) {
      console.log('❌ Нет сохраненных сессий для тестирования')
      return
    }
    
    console.log('📋 Найдена сессия для тестирования:')
    console.log(`   ID: ${integration.id}`)
    console.log(`   Статус: ${integration.status}`)
    console.log(`   Размер сессии: ${integration.encryptedWebSession?.length} символов`)
    console.log(`   Последнее обновление: ${integration.updatedAt}`)
    console.log('')
    
    // Получаем менеджер
    const manager = WhatsAppWebManager.getInstance(integration.companyId)
    
    console.log('🔄 Пытаемся восстановить сессию...')
    
    // Тестируем метод обеспечения сессии
    const sessionReady = await manager.ensureSession(integration.id)
    
    if (sessionReady) {
      console.log('✅ Сессия успешно восстановлена!')
      
      // Проверяем состояние в базе
      const updated = await prisma.whatsAppIntegration.findUnique({
        where: { id: integration.id }
      })
      
      console.log(`   Новый статус: ${updated?.status}`)
      console.log(`   Connection status: ${updated?.connectionStatus}`)
      
    } else {
      console.log('❌ Не удалось восстановить сессию')
      
      const updated = await prisma.whatsAppIntegration.findUnique({
        where: { id: integration.id }
      })
      
      console.log(`   Ошибка: ${updated?.lastError}`)
    }
    
  } catch (error) {
    console.error('💥 Ошибка теста:', error)
  }
  
  process.exit(0)
}

testSessionRestore()
