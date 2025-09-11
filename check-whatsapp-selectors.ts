import puppeteer from 'puppeteer'

async function checkWhatsAppSelectors() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  })

  try {
    const page = await browser.newPage()
    
    console.log('🌐 Загружаем WhatsApp Web...')
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2' })
    
    // Даем время загрузиться
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    console.log('🔍 Проверяем доступные селекторы QR-кода...')
    
    const selectors = [
      'canvas[aria-label="Scan me!"]',
      'canvas',
      '[data-ref]',
      '[data-testid*="qr"]',
      '.qr-canvas canvas',
      '._2EZ_m'
    ]
    
    for (const selector of selectors) {
      try {
        const element = await page.$(selector)
        if (element) {
          console.log(`✅ Найден селектор: ${selector}`)
          const tagName = await element.evaluate(el => el.tagName)
          const className = await element.evaluate(el => el.className)
          const id = await element.evaluate(el => el.id)
          console.log(`   Tag: ${tagName}, Class: ${className}, ID: ${id}`)
        }
      } catch (error) {
        console.log(`❌ Не найден: ${selector}`)
      }
    }
    
    // Проверяем всю структуру страницы
    console.log('\n📋 Структура страницы:')
    const pageContent = await page.evaluate(() => {
      const qrElements = Array.from(document.querySelectorAll('canvas, [class*="qr"], [data-testid*="qr"]'))
      return qrElements.map(el => ({
        tag: el.tagName,
        class: el.className,
        id: el.id,
        dataTestId: el.getAttribute('data-testid'),
        ariaLabel: el.getAttribute('aria-label')
      }))
    })
    
    console.log(JSON.stringify(pageContent, null, 2))
    
    console.log('\n⏳ Оставляем браузер открытым на 30 сек для визуального осмотра...')
    await new Promise(resolve => setTimeout(resolve, 30000))
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await browser.close()
  }
}

checkWhatsAppSelectors().catch(console.error)
