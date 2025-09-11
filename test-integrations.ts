// Простой скрипт для тестирования интеграций
import { testAPI } from './api/integrations/test-api'

async function testWhatsAppIntegration() {
  console.log('🚀 Тестирование WhatsApp интеграции...')
  
  try {
    // Начинаем QR авторизацию
    const qrResult = await testAPI.startQRAuth({
      companyId: 'comp1',
      integrationType: 'WHATSAPP'
    })
    
    console.log('QR Auth Result:', qrResult)
    
    if (qrResult.success && qrResult.data) {
      const integrationId = qrResult.data.integrationId
      console.log(`Integration ID: ${integrationId}`)
      console.log('QR Code generated - scan it in WhatsApp!')
      
      // Здесь можно добавить ожидание сканирования
      // В реальном сценарии пользователь сканирует QR-код
      
      return integrationId
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

async function testTelegramIntegration() {
  console.log('🚀 Тестирование Telegram интеграции...')
  
  try {
    const qrResult = await testAPI.startQRAuth({
      companyId: 'comp1',
      integrationType: 'TELEGRAM'
    })
    
    console.log('QR Auth Result:', qrResult)
    
    if (qrResult.success && qrResult.data) {
      const integrationId = qrResult.data.integrationId
      console.log(`Integration ID: ${integrationId}`)
      console.log('QR Code generated - scan it in Telegram!')
      
      return integrationId
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

async function testMessageSending(integrationId: string, type: 'WHATSAPP' | 'TELEGRAM') {
  console.log(`📱 Тестирование отправки сообщений ${type}...`)
  
  const recipient = type === 'WHATSAPP' ? '+79991234567' : 'testuser'
  const message = `Тестовое сообщение из TenderAI через ${type} Web! ${new Date().toLocaleString()}`
  
  try {
    const result = await testAPI.sendMessage({
      integrationId,
      integrationType: type,
      recipient,
      message
    })
    
    console.log('Send Message Result:', result)
  } catch (error) {
    console.error('Error:', error)
  }
}

async function runTests() {
  console.log('🧪 Запуск тестов интеграций TenderAI\n')
  
  // Тест WhatsApp
  const waIntegrationId = await testWhatsAppIntegration()
  
  // Тест Telegram  
  const tgIntegrationId = await testTelegramIntegration()
  
  console.log('\n📋 Результаты:')
  console.log('WhatsApp Integration ID:', waIntegrationId)
  console.log('Telegram Integration ID:', tgIntegrationId)
  
  // Для тестирования отправки сообщений (после сканирования QR-кодов):
  // if (waIntegrationId) {
  //   await testMessageSending(waIntegrationId, 'WHATSAPP')
  // }
  // if (tgIntegrationId) {
  //   await testMessageSending(tgIntegrationId, 'TELEGRAM')  
  // }
}

// Запуск тестов
if (require.main === module) {
  runTests().catch(console.error)
}

export { testWhatsAppIntegration, testTelegramIntegration, testMessageSending }
