import { WebSessionManager, WebSession, QRCodeData } from './web-session-manager'
import { prisma } from '../../lib/prisma'
import { IntegrationStatus, IntegrationType } from '@prisma/client'
import * as QRCode from 'qrcode'
import puppeteer, { Browser, Page } from 'puppeteer'

export class WhatsAppWebManager extends WebSessionManager {
  private browser: Browser | null = null
  private page: Page | null = null

  constructor(companyId: string) {
    super(companyId, IntegrationType.WHATSAPP)
  }

  async generateQRCode(integrationId: string): Promise<string> {
    try {
      // Обновляем статус в базе данных
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.CONNECTING,
          connectionStatus: 'waiting_qr',
          lastError: null
        }
      })

      // Запускаем браузер
      this.browser = await puppeteer.launch({
        headless: false, // Для отладки, в продакшене должен быть true
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      })

      this.page = await this.browser.newPage()
      
      // Устанавливаем user agent
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      // Переходим на WhatsApp Web
      await this.page.goto('https://web.whatsapp.com', { 
        waitUntil: 'networkidle0',
        timeout: 60000
      })

      // Ждем появления QR-кода
      await this.page.waitForSelector('canvas[aria-label="Scan this QR code to link a device!"]', { 
        timeout: 30000 
      })

      // Получаем QR-код
      const qrCodeElement = await this.page.$('canvas[aria-label="Scan this QR code to link a device!"]')
      if (!qrCodeElement) {
        throw new Error('QR code not found')
      }

      // Делаем скриншот QR-кода
      const qrCodeBuffer = await qrCodeElement.screenshot({ type: 'png' })
      const qrCodeBase64 = qrCodeBuffer.toString('base64')

      // Сохраняем QR-код в базу данных
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 минут
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          qrCodeData: `data:image/png;base64,${qrCodeBase64}`,
          qrCodeExpiresAt: expiresAt,
          connectionStatus: 'scanning'
        }
      })

      // Логируем
      await prisma.integrationLog.create({
        data: {
          companyId: this.companyId,
          integrationType: IntegrationType.WHATSAPP,
          integrationId,
          action: 'qr_code_generated',
          status: 'SUCCESS',
          message: 'WhatsApp Web QR code generated successfully'
        }
      })

      return `data:image/png;base64,${qrCodeBase64}`
    } catch (error) {
      console.error('Failed to generate WhatsApp QR code:', error)
      
      // Записываем ошибку в базу
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.ERROR,
          lastError: error instanceof Error ? error.message : 'Unknown error',
          connectionStatus: 'error'
        }
      })

      throw error
    }
  }

  async waitForAuthentication(integrationId: string): Promise<boolean> {
    if (!this.page) {
      throw new Error('Page not initialized. Call generateQRCode first.')
    }

    try {
      // Обновляем статус
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          connectionStatus: 'connecting'
        }
      })

      // Ждем исчезновения QR-кода (признак успешной авторизации)
      await this.page.waitForSelector('canvas[aria-label="Scan this QR code to link a device!"]', { 
        hidden: true, 
        timeout: 300000 // 5 минут
      })

      // Дожидаемся полной загрузки главного интерфейса
      console.log('Waiting for WhatsApp main interface to load...')
      
      // Проверяем несколько возможных селекторов
      const possibleSelectors = [
        '.app-wrapper-web',
        '[role="main"]', 
        '[data-testid="chat-list"]',
        '[data-testid="side"]',
        '._2QgSC', // Один из возможных CSS классов
      ]
      
      let interfaceLoaded = false
      for (const selector of possibleSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 20000 })
          console.log(`Found interface element: ${selector}`)
          interfaceLoaded = true
          break
        } catch (e) {
          console.log(`Selector ${selector} not found, trying next...`)
        }
      }
      
      if (!interfaceLoaded) {
        console.log('No specific selector found, waiting for page stability...')
        // Просто ждем немного больше
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
      
      // Дополнительно ждем 3 секунды для полной загрузки
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Получаем информацию о пользователе
      let displayName = 'WhatsApp User'
      let phoneNumber = null
      
      try {
        // Пытаемся получить имя пользователя
        const nameElement = await this.page.$('[data-testid="chatlist-header"] [title]')
        if (nameElement) {
          displayName = await this.page.evaluate(el => el.textContent || 'WhatsApp User', nameElement)
        }
      } catch (e) {
        console.log('Could not get user display name')
      }

      // Сохраняем сессию
      const sessionData: WebSession = {
        sessionId: `whatsapp_${Date.now()}`,
        cookies: await this.page.cookies(),
        localStorage: await this.page.evaluate(() => ({
          ...localStorage
        })),
        sessionStorage: await this.page.evaluate(() => ({
          ...sessionStorage
        })),
        userAgent: await this.page.evaluate(() => navigator.userAgent),
        viewport: this.page.viewport() || { width: 1366, height: 768 },
        lastActivity: new Date()
      }

      await this.saveSession(integrationId, sessionData)

      // Обновляем информацию в базе данных
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.CONNECTED,
          displayName,
          phoneNumber,
          connectionStatus: 'connected',
          qrCodeData: null,
          qrCodeExpiresAt: null,
          lastCheckedAt: new Date(),
          webSessionUrl: 'https://web.whatsapp.com',
          userAgent: sessionData.userAgent
        }
      })

      // Логируем успешное подключение
      await prisma.integrationLog.create({
        data: {
          companyId: this.companyId,
          integrationType: IntegrationType.WHATSAPP,
          integrationId,
          action: 'authentication_success',
          status: 'SUCCESS',
          message: `WhatsApp Web session established for ${displayName}`
        }
      })

      return true
    } catch (error) {
      console.error('WhatsApp authentication failed:', error)
      
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.ERROR,
          lastError: error instanceof Error ? error.message : 'Authentication timeout',
          connectionStatus: 'error'
        }
      })

      return false
    } finally {
      // Закрываем браузер
      if (this.browser) {
        await this.browser.close()
        this.browser = null
        this.page = null
      }
    }
  }

  async sendMessage(integrationId: string, recipient: string, message: string): Promise<boolean> {
    console.log(`Sending WhatsApp message to ${recipient}: ${message}`)
    
    try {
      // Загружаем сохраненную сессию
      const sessionData = await this.loadSession(integrationId)
      if (!sessionData) {
        throw new Error('No saved session found. Please authenticate first.')
      }

      // Запускаем новый браузер для отправки сообщения
      this.browser = await puppeteer.launch({
        headless: false, // Для отладки
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      })

      this.page = await this.browser.newPage()
      
      console.log('Восстанавливаем сохраненную сессию WhatsApp...')
      
      // 1. Устанавливаем user agent и viewport
      await this.page.setUserAgent(sessionData.userAgent)
      await this.page.setViewport(sessionData.viewport)
      
      // 2. Устанавливаем cookies ДО перехода на страницу
      if (sessionData.cookies && sessionData.cookies.length > 0) {
        console.log(`Восстанавливаем ${sessionData.cookies.length} cookies`)
        await this.page.setCookie(...sessionData.cookies)
      }
      
      // 3. Настраиваем localStorage и sessionStorage для всех новых документов
      await this.page.evaluateOnNewDocument((data) => {
        console.log('Восстанавливаем localStorage и sessionStorage...')
        if (data.localStorage) {
          Object.keys(data.localStorage).forEach(key => {
            try {
              localStorage.setItem(key, data.localStorage[key])
            } catch (e) {
              console.log('Ошибка установки localStorage:', key, e)
            }
          })
        }
        if (data.sessionStorage) {
          Object.keys(data.sessionStorage).forEach(key => {
            try {
              sessionStorage.setItem(key, data.sessionStorage[key])
            } catch (e) {
              console.log('Ошибка установки sessionStorage:', key, e)
            }
          })
        }
      }, sessionData)
      
      // 4. Переходим на WhatsApp Web с восстановленной сессией
      console.log('Переходим на WhatsApp Web с восстановленной сессией...')
      await this.page.goto('https://web.whatsapp.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000
      })
      
      // Ждем 3 секунды для полной загрузки
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Дополнительно восстанавливаем localStorage после загрузки
      try {
        await this.page.evaluate((data) => {
          if (data.localStorage) {
            Object.keys(data.localStorage).forEach(key => {
              try {
                localStorage.setItem(key, data.localStorage[key])
              } catch (e) {}
            })
          }
          if (data.sessionStorage) {
            Object.keys(data.sessionStorage).forEach(key => {
              try {
                sessionStorage.setItem(key, data.sessionStorage[key])
              } catch (e) {}
            })
          }
        }, sessionData)
        console.log('Дополнительно восстановили localStorage')
      } catch (e) {
        console.log('Ошибка дополнительного восстановления:', e)
      }
      
      // Проверяем, на какой странице мы оказались
      const currentUrl = this.page.url()
      console.log(`Текущий URL: ${currentUrl}`)
      
      // Если показывается QR-код, значит сессия не восстановилась
      const qrExists = await this.page.$('canvas[aria-label*="QR"], canvas[aria-label*="Scan"]')
      if (qrExists) {
        throw new Error('Сессия истекла - нужна повторная авторизация')
      }
      
      // Ждем загрузки интерфейса WhatsApp
      await this.page.waitForSelector('._2QgSC, [data-testid="chat-list"], .app-wrapper-web', { 
        timeout: 30000 
      })
      
      console.log('WhatsApp interface loaded successfully, searching for contact...')
      
      // Ищем контакт или создаем новый чат
      await this.searchAndOpenChat(recipient)
      
      // Отправляем сообщение
      await this.sendMessageInChat(message)
      
      // Логируем успешную отправку
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          messagesSent: { increment: 1 },
          lastCheckedAt: new Date()
        }
      })
      
      console.log('✅ WhatsApp message sent successfully!')
      return true
      
    } catch (error) {
      console.error('❌ Failed to send WhatsApp message:', error)
      
      // Логируем ошибку
      await prisma.integrationLog.create({
        data: {
          companyId: this.companyId,
          integrationType: IntegrationType.WHATSAPP,
          integrationId,
          action: 'send_message_failed',
          status: 'ERROR',
          message: `Failed to send message to ${recipient}: ${error}`,
          errorDetails: { error: error instanceof Error ? error.message : String(error) }
        }
      })
      
      return false
    } finally {
      // Закрываем браузер
      if (this.browser) {
        await this.browser.close()
        this.browser = null
        this.page = null
      }
    }
  }
  
  private async searchAndOpenChat(recipient: string): Promise<void> {
    // Нажимаем на кнопку поиска или создания нового чата
    const newChatSelectors = [
      '[data-testid="new-chat-btn"]',
      '._3WByx', // Кнопка новый чат
      '.enAC0', // Другой вариант
      '[title="Новый чат"]'
    ]
    
    let chatButtonFound = false
    for (const selector of newChatSelectors) {
      try {
        const button = await this.page.$(selector)
        if (button) {
          await button.click()
          chatButtonFound = true
          console.log(`Clicked new chat button using selector: ${selector}`)
          break
        }
      } catch (e) {
        continue
      }
    }
    
    if (!chatButtonFound) {
      // Пробуем найти поле поиска напрямую
      console.log('New chat button not found, trying search field directly...')
    }
    
    // Ждем появления поля поиска
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Ищем поле ввода для поиска контакта
    const searchSelectors = [
      '[data-testid="chat-list-search"]',
      '._2aBzC', // Поле поиска
      'input[placeholder*="поиск"], input[placeholder*="Search"]',
      '._3FRCZ input',
      '.copyable-text[data-tab="3"]' // Поле ввода номера
    ]
    
    let searchField = null
    for (const selector of searchSelectors) {
      searchField = await this.page.$(selector)
      if (searchField) {
        console.log(`Found search field using selector: ${selector}`)
        break
      }
    }
    
    if (!searchField) {
      throw new Error('Could not find search field')
    }
    
    // Очищаем поле и вводим номер
    await searchField.click()
    await searchField.focus()
    await this.page.keyboard.down('Control')
    await this.page.keyboard.press('a')
    await this.page.keyboard.up('Control')
    await searchField.type(recipient)
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Ищем результат поиска и кликаем на него
    const contactSelectors = [
      `[title*="${recipient}"]`,
      '._8nE1Y', // Результат поиска
      '._210SC', // Контакт в списке
      '.zoWT4' // Другой вариант
    ]
    
    let contactFound = false
    for (const selector of contactSelectors) {
      try {
        const contact = await this.page.$(selector)
        if (contact) {
          await contact.click()
          contactFound = true
          console.log(`Opened chat using selector: ${selector}`)
          break
        }
      } catch (e) {
        continue
      }
    }
    
    if (!contactFound) {
      // Если контакт не найден, пробуем нажать Enter для создания нового чата
      await this.page.keyboard.press('Enter')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // Ждем загрузки чата
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  private async sendMessageInChat(message: string): Promise<void> {
    // Ищем поле ввода сообщения
    const messageInputSelectors = [
      '[data-testid="compose-input"]',
      '._13NKt', // Поле ввода
      '.copyable-text[data-tab="1"]',
      '._3Whw5',
      'div[contenteditable="true"][data-tab="1"]'
    ]
    
    let messageInput = null
    for (const selector of messageInputSelectors) {
      messageInput = await this.page.$(selector)
      if (messageInput) {
        console.log(`Found message input using selector: ${selector}`)
        break
      }
    }
    
    if (!messageInput) {
      throw new Error('Could not find message input field')
    }
    
    // Вводим сообщение
    await messageInput.click()
    await messageInput.focus()
    
    // Очищаем поле
    await this.page.keyboard.down('Control')
    await this.page.keyboard.press('a')
    await this.page.keyboard.up('Control')
    
    await messageInput.type(message)
    
    // Ждем немного
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Отправляем сообщение
    await this.page.keyboard.press('Enter')
    
    // Ждем отправки
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('Message sent!')
  }

  async isConnected(integrationId: string): Promise<boolean> {
    const integration = await prisma.whatsAppIntegration.findUnique({
      where: { id: integrationId }
    })

    return integration?.status === IntegrationStatus.CONNECTED && 
           await this.checkSessionHealth(integrationId)
  }

  // Метод для очистки ресурсов
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }
}
