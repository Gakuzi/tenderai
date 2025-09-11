import { integrationManagerExtended } from './services/integrations/integration-manager'
import { IntegrationType } from '@prisma/client'

async function testWhatsAppOnly() {
  console.log('🚀 Тестирование только WhatsApp...')
  
  try {
    const result = await integrationManagerExtended.initializeQRAuth({
      companyId: 'cmffsq3q90007u81ibd97mbyu',
      integrationType: IntegrationType.WHATSAPP
    })
    
    console.log('✅ WhatsApp QR-код сгенерирован!')
    console.log('Integration ID:', result.integrationId)
    console.log('QR Code starts with:', result.qrCode.substring(0, 50) + '...')
    
    console.log('\n📱 Инструкции:')
    console.log('1. Откроется браузер с WhatsApp Web')
    console.log('2. На телефоне: WhatsApp → Меню → Связанные устройства → Привязать устройство')
    console.log('3. Отсканируйте QR-код с экрана браузера')
    console.log('4. Подождите завершения авторизации')
    
    console.log('\n⌛ Ожидаем авторизацию...')
    const authSuccess = await integrationManagerExtended.waitForAuthentication({
      integrationId: result.integrationId,
      integrationType: IntegrationType.WHATSAPP
    })
    
    if (authSuccess) {
      console.log('✅ Авторизация успешна!')
      
      // Проверяем статус
      const status = await integrationManagerExtended.checkStatus({
        integrationId: result.integrationId,
        integrationType: IntegrationType.WHATSAPP
      })
      console.log('📊 Статус интеграции:', status)
    } else {
      console.log('❌ Авторизация не удалась')
    }
    
    return result.integrationId
  } catch (error) {
    console.error('❌ Ошибка:', error)
    return null
  }
}

testWhatsAppOnly().catch(console.error)
