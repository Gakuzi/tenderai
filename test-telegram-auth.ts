import { integrationManagerExtended } from './services/integrations/integration-manager'
import { IntegrationType } from '@prisma/client'

async function testTelegramAuthFlow() {
  console.log('🚀 Полный тест авторизации Telegram')
  console.log('==================================\n')

  const companyId = 'cmffv19vr0004u8459d4zx9vr' // ID компании из базы
  
  try {
    // Шаг 1: Генерация QR-кода
    console.log('1️⃣ Генерируем QR-код для Telegram...')
    const qrResult = await integrationManagerExtended.initializeQRAuth({
      companyId,
      integrationType: IntegrationType.TELEGRAM
    })
    
    console.log('✅ QR-код сгенерирован!')
    console.log('Integration ID:', qrResult.integrationId)
    console.log('QR Code length:', qrResult.qrCode.length)
    console.log('Expires at:', qrResult.expiresAt)
    console.log('\n📱 Отсканируйте QR-код в мобильном приложении Telegram\n')

    // Шаг 2: Ожидание авторизации
    console.log('2️⃣ Ожидаем авторизацию... (максимум 5 минут)')
    
    const authSuccess = await integrationManagerExtended.waitForAuthentication({
      integrationId: qrResult.integrationId,
      integrationType: IntegrationType.TELEGRAM
    })

    if (authSuccess) {
      console.log('✅ Авторизация прошла успешно!')
      
      // Шаг 3: Проверяем статус интеграции
      const status = await integrationManagerExtended.getIntegrationStatus(
        qrResult.integrationId, 
        IntegrationType.TELEGRAM
      )
      
      console.log('\n📊 Статус интеграции:')
      console.log('Status:', status.status)
      console.log('Connection Status:', status.connectionStatus)
      
      // Шаг 4: Тестируем отправку сообщения (если авторизация успешна)
      if (status.status === 'CONNECTED') {
        console.log('\n3️⃣ Тестируем отправку сообщения...')
        
        const messageResult = await integrationManagerExtended.sendMessage(
          qrResult.integrationId,
          IntegrationType.TELEGRAM,
          'test_recipient', // В реальном сценарии здесь будет username или ID
          `Тестовое сообщение из TenderAI! ${new Date().toLocaleString()}`
        )
        
        if (messageResult.success) {
          console.log('✅ Сообщение отправлено успешно!')
        } else {
          console.log('❌ Ошибка отправки сообщения:', messageResult.error)
        }
      }
      
    } else {
      console.log('❌ Авторизация не удалась')
    }

  } catch (error) {
    console.error('❌ Ошибка во время тестирования:', error)
  }
}

// Запуск теста
testTelegramAuthFlow().catch(console.error)
