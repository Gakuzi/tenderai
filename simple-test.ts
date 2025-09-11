import { integrationManagerExtended } from './services/integrations/integration-manager'
import { IntegrationType } from '@prisma/client'

async function testWhatsAppQR() {
  console.log('🚀 Тестирование WhatsApp QR генерации...')
  
  try {
    const result = await integrationManagerExtended.initializeQRAuth({
      companyId: 'cmffv19vr0004u8459d4zx9vr', // ID компании из базы
      integrationType: IntegrationType.WHATSAPP
    })
    
    console.log('✅ QR-код для WhatsApp сгенерирован!')
    console.log('Integration ID:', result.integrationId)
    console.log('QR Code length:', result.qrCode.length)
    console.log('Expires at:', result.expiresAt)
    
    return result.integrationId
  } catch (error) {
    console.error('❌ Ошибка:', error)
    return null
  }
}

async function testTelegramQR() {
  console.log('\n🚀 Тестирование Telegram QR генерации...')
  
  try {
    const result = await integrationManagerExtended.initializeQRAuth({
      companyId: 'cmffv19vr0004u8459d4zx9vr',
      integrationType: IntegrationType.TELEGRAM
    })
    
    console.log('✅ QR-код для Telegram сгенерирован!')
    console.log('Integration ID:', result.integrationId)
    console.log('QR Code length:', result.qrCode.length)
    console.log('Expires at:', result.expiresAt)
    
    return result.integrationId
  } catch (error) {
    console.error('❌ Ошибка:', error)
    return null
  }
}

async function runQuickTest() {
  console.log('🧪 Быстрый тест интеграций TenderAI')
  console.log('====================================\n')
  
  const waId = await testWhatsAppQR()
  const tgId = await testTelegramQR()
  
  console.log('\n📋 Результаты:')
  console.log('WhatsApp Integration ID:', waId)
  console.log('Telegram Integration ID:', tgId)
  
  if (waId || tgId) {
    console.log('\n✅ Тест прошел успешно!')
    console.log('Откройте браузеры, которые должны были открыться для сканирования QR-кодов')
  } else {
    console.log('\n❌ Тест не удался')
  }
}

runQuickTest().catch(console.error)
