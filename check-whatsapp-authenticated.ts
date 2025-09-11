import puppeteer from 'puppeteer'

async function checkAuthenticatedSelectors() {
  console.log('🔍 Проверяем селекторы для авторизованного состояния WhatsApp Web...')
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  })

  try {
    const page = await browser.newPage()
    
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2' })
    
    console.log('⏳ Ожидаем авторизации... (отсканируйте QR-код)')
    
    // Ждем исчезновения QR-кода
    try {
      await page.waitForSelector('canvas[aria-label="Scan this QR code to link a device!"]', { 
        hidden: true, 
        timeout: 300000 // 5 минут
      })
      console.log('✅ QR-код исчез - авторизация прошла!')
    } catch (error) {
      console.log('❌ Таймаут ожидания авторизации')
      return
    }
    
    // Ждем немного для загрузки интерфейса
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('🔍 Проверяем доступные селекторы после авторизации...')
    
    const selectors = [
      '[data-testid="chat-list"]',
      '[data-testid="chatlist-header"]',
      '[data-testid="side"]',
      '[role="main"]',
      '[title]',
      '.app-wrapper-web',
      '._2QgSC',
      '._1uuXL'
    ]
    
    for (const selector of selectors) {
      try {
        const element = await page.$(selector)
        if (element) {
          console.log(`✅ Найден: ${selector}`)
          const tagName = await element.evaluate(el => el.tagName)
          const className = await element.evaluate(el => el.className)
          const textContent = await element.evaluate(el => (el.textContent || '').substring(0, 50))
          console.log(`   Tag: ${tagName}, Class: ${className.substring(0, 50)}, Text: ${textContent}`)
        } else {
          console.log(`❌ Не найден: ${selector}`)
        }
      } catch (error) {
        console.log(`❌ Ошибка с ${selector}:`, error.message.substring(0, 50))
      }
    }
    
    // Проверяем общую структуру
    console.log('\n📋 Общая структура авторизованной страницы:')
    const pageStructure = await page.evaluate(() => {
      const mainElements = Array.from(document.querySelectorAll('[data-testid], [role], .app-wrapper-web, main, [class*="chat"], [class*="list"]'))
      return mainElements.slice(0, 10).map(el => ({
        tag: el.tagName,
        class: el.className.substring(0, 50),
        id: el.id,
        dataTestId: el.getAttribute('data-testid'),
        role: el.getAttribute('role'),
        text: (el.textContent || '').substring(0, 30)
      }))
    })
    
    console.log(JSON.stringify(pageStructure, null, 2))
    
    console.log('\n⏳ Оставляем браузер открытым на 60 сек для анализа...')
    await new Promise(resolve => setTimeout(resolve, 60000))
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await browser.close()
  }
}

checkAuthenticatedSelectors().catch(console.error)
