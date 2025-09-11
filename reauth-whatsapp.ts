import { integrationManagerExtended } from './services/integrations/integration-manager'
import { IntegrationType } from '@prisma/client'

async function reauthenticateWhatsApp() {
  console.log('🔄 Повторная авторизация WhatsApp с исправленным сохранением сессии\n')
  
  const companyId = 'cmffv19vr0004u8459d4zx9vr' // ID компании
  
  try {
    // Шаг 1: Генерируем новый QR-код
    console.log('1️⃣ Генерируем QR-код для WhatsApp...')
    const qrResult = await integrationManagerExtended.initializeQRAuth({
      companyId,
      integrationType: IntegrationType.WHATSAPP
    })
    
    console.log('✅ QR-код сгенерирован!')
    console.log('Integration ID:', qrResult.integrationId)
    console.log('QR Code length:', qrResult.qrCode.length)
    console.log('\n📱 Отсканируйте QR-код в мобильном приложении WhatsApp')
    console.log('⏰ После сканирования дождитесь полной загрузки интерфейса WhatsApp Web')
    console.log('\n2️⃣ Ожидаем авторизацию... (максимум 5 минут)')
    
    // Шаг 2: Ждем авторизации
    const authSuccess = await integrationManagerExtended.waitForAuthentication({
      integrationId: qrResult.integrationId,
      integrationType: IntegrationType.WHATSAPP
    })

    if (authSuccess) {
      console.log('\n✅ Авторизация прошла успешно!')
      console.log('💾 Сессия сохранена с исправлениями')
      
      // Проверяем статус
      const status = await integrationManagerExtended.getIntegrationStatus(
        qrResult.integrationId, 
        IntegrationType.WHATSAPP
      )
      
      console.log('\n📊 Статус интеграции:')
      console.log('Status:', status.status)
      console.log('Connection Status:', status.connectionStatus)
      
      if (status.status === 'CONNECTED') {
        console.log('\n🎉 WhatsApp интеграция готова к использованию!')
        console.log(`Integration ID для тестов: ${qrResult.integrationId}`)
        
        // Тестируем отправку сообщения
        console.log('\n3️⃣ Тестируем отправку сообщения на +79214962555...')
        
        const testMessage = `🤖 Тест из TenderAI WhatsApp!
Время: ${new Date().toLocaleString()}
Integration ID: ${qrResult.integrationId.slice(-8)}
Статус: Сессия успешно сохранена ✅`

        const messageResult = await integrationManagerExtended.sendMessage(
          qrResult.integrationId,
          IntegrationType.WHATSAPP,
          '+79214962555',
          testMessage
        )
        
        if (messageResult.success) {
          console.log('✅ Тестовое сообщение отправлено успешно!')
        } else {
          console.log('❌ Ошибка отправки сообщения:', messageResult.error)
        }
      }
      
    } else {
      console.log('\n❌ Авторизация не удалась')
    }

  } catch (error) {
    console.error('\n❌ Ошибка во время авторизации:', error)
  }
}

// Запуск
reauthenticateWhatsApp().catch(console.error)
