import { integrationManagerExtended } from './services/integrations/integration-manager'
import { IntegrationType } from '@prisma/client'

async function testWhatsAppMessage() {
  console.log('💬 Тестирование отправки сообщений WhatsApp...')
  
  // Проверяем наличие подключенной интеграции
  const integrations = await integrationManagerExtended.getCompanyIntegrations('cmffsq3q90007u81ibd97mbyu')
  const whatsappIntegration = integrations.find(i => i.type === IntegrationType.WHATSAPP && i.isActive)
  
  if (!whatsappIntegration) {
    console.log('❌ Нет активной WhatsApp интеграции. Сначала выполните авторизацию.')
    return
  }
  
  console.log(`✅ Найдена активная интеграция: ${whatsappIntegration.id}`)
  console.log(`📱 Имя: ${whatsappIntegration.displayName}`)
  
  try {
    // Тестируем отправку сообщения
    const recipient = '+79991234567' // Замените на реальный номер для теста
    const message = `🤖 Тестовое сообщение от TenderAI\nВремя: ${new Date().toLocaleString('ru-RU')}`
    
    console.log(`📤 Отправляем сообщение на ${recipient}...`)
    
    const result = await integrationManagerExtended.sendMessage(
      whatsappIntegration.id,
      IntegrationType.WHATSAPP,
      recipient,
      message
    )
    
    if (result.success) {
      console.log('✅ Сообщение отправлено успешно!')
      console.log(`🕒 Время: ${result.timestamp}`)
    } else {
      console.log('❌ Ошибка отправки:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  }
}

testWhatsAppMessage().catch(console.error)
