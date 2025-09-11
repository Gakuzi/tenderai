import { WebSessionManager, WebSession, QRCodeData } from './web-session-manager'
import { prisma } from '../../lib/prisma'
import { IntegrationStatus, IntegrationType } from '@prisma/client'
import puppeteer, { Browser, Page } from 'puppeteer'

export class TelegramWebManager extends WebSessionManager {
  private browser: Browser | null = null
  private page: Page | null = null

  constructor(companyId: string) {
    super(companyId, IntegrationType.TELEGRAM)
  }

  async generateQRCode(integrationId: string): Promise<string> {
    try {
      // Обновляем статус в базе данных
      await prisma.telegramIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.CONNECTING,
          connectionStatus: 'waiting_qr',
          lastError: null
        }
      })

      // Запускаем браузер
      this.browser = await puppeteer.launch({
        headless: false, // Для отладки
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
      
      // Переходим на Telegram Web
      await this.page.goto('https://web.telegram.org', { 
        waitUntil: 'networkidle0',
        timeout: 60000
      })

      // Ждем появления QR-кода
      await this.page.waitForSelector('.qr-canvas canvas', { 
        timeout: 30000 
      })

      // Получаем QR-код
      const qrCodeElement = await this.page.$('.qr-canvas canvas')
      if (!qrCodeElement) {
        throw new Error('Telegram QR code not found')
      }

      // Делаем скриншот QR-кода
      const qrCodeBuffer = await qrCodeElement.screenshot({ type: 'png' })
      const qrCodeBase64 = qrCodeBuffer.toString('base64')

      // Сохраняем QR-код в базу данных
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 минут
      await prisma.telegramIntegration.update({
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
          integrationType: IntegrationType.TELEGRAM,
          integrationId,
          action: 'qr_code_generated',
          status: 'SUCCESS',
          message: 'Telegram Web QR code generated successfully'
        }
      })

      return `data:image/png;base64,${qrCodeBase64}`
    } catch (error) {
      console.error('Failed to generate Telegram QR code:', error)
      
      // Записываем ошибку в базу
      await prisma.telegramIntegration.update({
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
      await prisma.telegramIntegration.update({
        where: { id: integrationId },
        data: {
          connectionStatus: 'connecting'
        }
      })

      // Ждем исчезновения QR-кода (признак успешной авторизации)
      await this.page.waitForSelector('.qr-canvas', { 
        hidden: true, 
        timeout: 300000 // 5 минут
      })

      // Ждем загрузки основного интерфейса Telegram
      await this.page.waitForSelector('.chat-list', { 
        timeout: 60000 
      })

      // Получаем информацию о пользователе
      let displayName = 'Telegram User'
      let sessionUsername = null
      
      try {
        // Пытаемся получить имя пользователя из интерфейса
        await this.page.waitForSelector('.sidebar-header .person', { timeout: 10000 })
        const nameElement = await this.page.$('.sidebar-header .person .title')
        if (nameElement) {
          displayName = await this.page.evaluate(el => el.textContent || 'Telegram User', nameElement)
        }

        // Пытаемся получить username
        const usernameElement = await this.page.$('.sidebar-header .person .subtitle')
        if (usernameElement) {
          sessionUsername = await this.page.evaluate(el => el.textContent || null, usernameElement)
        }
      } catch (e) {
        console.log('Could not get user info from Telegram interface')
      }

      // Сохраняем сессию
      const sessionData: WebSession = {
        sessionId: `telegram_${Date.now()}`,
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
      await prisma.telegramIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.CONNECTED,
          displayName,
          sessionUsername: sessionUsername?.replace('@', '') || null,
          connectionStatus: 'connected',
          qrCodeData: null,
          qrCodeExpiresAt: null,
          lastCheckedAt: new Date(),
          webSessionUrl: 'https://web.telegram.org',
          userAgent: sessionData.userAgent
        }
      })

      // Логируем успешное подключение
      await prisma.integrationLog.create({
        data: {
          companyId: this.companyId,
          integrationType: IntegrationType.TELEGRAM,
          integrationId,
          action: 'authentication_success',
          status: 'SUCCESS',
          message: `Telegram Web session established for ${displayName}`
        }
      })

      return true
    } catch (error) {
      console.error('Telegram authentication failed:', error)
      
      await prisma.telegramIntegration.update({
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
    // Эта функция будет реализована позже для отправки сообщений через сохраненную сессию
    console.log(`Sending Telegram message to ${recipient}: ${message}`)
    
    // Здесь будет код для восстановления сессии и отправки сообщения
    // через веб-интерфейс Telegram
    return true
  }

  async isConnected(integrationId: string): Promise<boolean> {
    const integration = await prisma.telegramIntegration.findUnique({
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
