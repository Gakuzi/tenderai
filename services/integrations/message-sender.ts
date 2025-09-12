import puppeteer, { Browser, Page } from 'puppeteer'
import { WebSession } from './web-session-manager'
import { decrypt } from '../../lib/encryption'
import { prisma } from '../../lib/prisma'

export interface MessageResult {
  success: boolean
  messageId?: string
  error?: string
  timestamp: Date
}

export class WhatsAppMessageSender {
  private browser: Browser | null = null
  private page: Page | null = null

  async sendMessage(integrationId: string, recipient: string, message: string): Promise<MessageResult> {
    try {
      // Загружаем сессию из базы данных
      const integration = await prisma.whatsAppIntegration.findUnique({
        where: { id: integrationId }
      })

      if (!integration || !integration.encryptedWebSession) {
        throw new Error('Integration not found or not connected')
      }

      // Расшифровываем сессию
      const sessionData: WebSession = JSON.parse(decrypt(integration.encryptedWebSession))

      // Запускаем браузер
      this.browser = await puppeteer.launch({
        headless: false, // Для отладки
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      })

      this.page = await this.browser.newPage()

      // Восстанавливаем сессию
      await this.restoreSession(sessionData)

      // Переходим на WhatsApp Web
      await this.page.goto('https://web.whatsapp.com', { 
        waitUntil: 'networkidle0',
        timeout: 60000
      })

      // Ждем загрузки интерфейса (используем рабочий селектор)
      await this.page.waitForSelector('.app-wrapper-web', { 
        timeout: 30000 
      })
      
      // Дополнительно ждем полной загрузки
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Ищем контакт или создаем новый чат
      await this.findOrCreateChat(recipient)

      // Отправляем сообщение
      await this.sendTextMessage(message)

      // Обновляем статистику
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          messagesSent: { increment: 1 },
          lastCheckedAt: new Date()
        }
      })

      // Логируем успешную отправку
      await prisma.integrationLog.create({
        data: {
          companyId: integration.companyId,
          integrationType: 'WHATSAPP',
          integrationId,
          action: 'send_message',
          status: 'SUCCESS',
          message: `Message sent to ${recipient}: ${message.substring(0, 100)}...`
        }
      })

      return {
        success: true,
        messageId: `wa_${Date.now()}`,
        timestamp: new Date()
      }

    } catch (error) {
      console.error('Failed to send WhatsApp message:', error)
      
      // Логируем ошибку
      const integration = await prisma.whatsAppIntegration.findUnique({
        where: { id: integrationId }
      })
      
      if (integration) {
        await prisma.integrationLog.create({
          data: {
            companyId: integration.companyId,
            integrationType: 'WHATSAPP',
            integrationId,
            action: 'send_message',
            status: 'ERROR',
            message: `Failed to send message to ${recipient}`,
            errorDetails: { error: error instanceof Error ? error.message : 'Unknown error' }
          }
        })
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    } finally {
      await this.cleanup()
    }
  }

  private async restoreSession(sessionData: WebSession): Promise<void> {
    if (!this.page) return

    // Восстанавливаем cookies
    await this.page.setCookie(...sessionData.cookies)

    // Восстанавливаем localStorage
    await this.page.evaluateOnNewDocument((localStorage) => {
      for (const [key, value] of Object.entries(localStorage)) {
        window.localStorage.setItem(key, value)
      }
    }, sessionData.localStorage)

    // Восстанавливаем sessionStorage  
    await this.page.evaluateOnNewDocument((sessionStorage) => {
      for (const [key, value] of Object.entries(sessionStorage)) {
        window.sessionStorage.setItem(key, value)
      }
    }, sessionData.sessionStorage)

    // Устанавливаем viewport
    await this.page.setViewport(sessionData.viewport)
  }

  private async findOrCreateChat(recipient: string): Promise<void> {
    if (!this.page) return

    try {
      // Нажимаем на кнопку "Новый чат"
      await this.page.waitForSelector('[data-testid="chat"]', { timeout: 10000 })
      
      // Пытаемся найти существующий чат
      const existingChat = await this.page.$(`[title*="${recipient}"]`)
      
      if (existingChat) {
        // Кликаем на существующий чат
        await existingChat.click()
        return
      }

      // Если чат не найден, создаем новый
      await this.page.click('[data-testid="menu-bar-search"]')
      
      // Вводим номер/имя контакта
      await this.page.waitForSelector('input[data-testid="search-input"]')
      await this.page.type('input[data-testid="search-input"]', recipient)
      
      // Ждем результатов поиска
      await this.page.waitForTimeout(2000)
      
      // Кликаем на первый результат
      const searchResults = await this.page.$$('[data-testid="chat-list"] > div')
      if (searchResults.length > 0) {
        await searchResults[0].click()
      } else {
        throw new Error(`Contact ${recipient} not found`)
      }

    } catch (error) {
      console.error('Failed to find/create chat:', error)
      throw error
    }
  }

  private async sendTextMessage(message: string): Promise<void> {
    if (!this.page) return

    try {
      // Ждем поле ввода сообщения
      await this.page.waitForSelector('[data-testid="conversation-compose-box-input"]', { 
        timeout: 10000 
      })

      // Вводим сообщение
      await this.page.click('[data-testid="conversation-compose-box-input"]')
      await this.page.type('[data-testid="conversation-compose-box-input"]', message)

      // Нажимаем Enter или кнопку отправки
      await this.page.keyboard.press('Enter')

      // Ждем отправки сообщения
      await this.page.waitForTimeout(2000)

    } catch (error) {
      console.error('Failed to send text message:', error)
      throw error
    }
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }
}

export class TelegramMessageSender {
  async sendMessage(integrationId: string, recipient: string, message: string): Promise<MessageResult> {
    try {
      // Загружаем интеграцию из базы данных
      const integration = await prisma.telegramIntegration.findUnique({
        where: { id: integrationId }
      })

      if (!integration) {
        throw new Error('Telegram integration not found')
      }

      if (!integration.encryptedWebSession) {
        throw new Error('Telegram not connected')
      }

      // Используем TelegramGramJSManager для отправки сообщений
      const { TelegramGramJSManager } = await import('./telegram-gramjs-manager')
      const manager = new TelegramGramJSManager(integration.companyId)
      
      // Отправляем сообщение через GramJS
      const result = await manager.sendMessage({
        chatId: recipient,
        message: message
      })

      if (result.success) {
        // Обновляем статистику
        await prisma.telegramIntegration.update({
          where: { id: integrationId },
          data: {
            messagesSent: { increment: 1 },
            lastCheckedAt: new Date()
          }
        })

        // Логируем успешную отправку
        await prisma.integrationLog.create({
          data: {
            companyId: integration.companyId,
            integrationType: 'TELEGRAM',
            integrationId,
            action: 'send_message',
            status: 'SUCCESS',
            message: `Message sent to ${recipient}: ${message.substring(0, 100)}...`
          }
        })
      }

      return result

    } catch (error) {
      console.error('Failed to send Telegram message:', error)
      
      // Логируем ошибку
      const integration = await prisma.telegramIntegration.findUnique({
        where: { id: integrationId },
        select: { companyId: true }
      })
      
      if (integration) {
        await prisma.integrationLog.create({
          data: {
            companyId: integration.companyId,
            integrationType: 'TELEGRAM',
            integrationId,
            action: 'send_message',
            status: 'ERROR',
            message: `Failed to send message to ${recipient}`,
            errorDetails: { error: error instanceof Error ? error.message : 'Unknown error' }
          }
        })
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    }
  }
}
