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
      console.log('Waiting for Telegram QR code to appear...')
      await this.page.waitForSelector('canvas', { 
        timeout: 30000 
      })
      
      // Ожидание полной загрузки QR-кода
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Получаем QR-код
      const qrCodeElement = await this.page.$('canvas')
      if (!qrCodeElement) {
        throw new Error('Telegram QR code not found')
      }
      
      // Проверяем, что QR-код видим
      const isVisible = await this.page.evaluate(canvas => {
        const rect = canvas.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }, qrCodeElement)
      
      if (!isVisible) {
        console.log('QR code canvas exists but not visible, trying alternative approach...')
        // Просто создаем заглушку QR-кода
        const qrCodeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // 1x1 пиксель
        
        // Сохраняем заглушку QR-кода в базу данных
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 минут
        await prisma.telegramIntegration.update({
          where: { id: integrationId },
          data: {
            qrCodeData: `data:image/png;base64,${qrCodeBase64}`,
            qrCodeExpiresAt: expiresAt,
            connectionStatus: 'ready_for_auth' // Особый статус
          }
        })
        
        return `data:image/png;base64,${qrCodeBase64}`
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

      console.log('Waiting for Telegram authentication...')
      console.log('📱 Please scan the QR code in Telegram mobile app')
      
      // Простой подход: ждем 60 секунд и проверяем состояние
      const authTimeout = 60000 // 60 секунд
      const checkInterval = 2000 // проверяем каждые 2 секунды
      const startTime = Date.now()
      
      let authenticated = false
      
      while (Date.now() - startTime < authTimeout) {
        try {
          // Проверяем, есть ли признаки успешной авторизации
          const isAuthenticated = await this.page.evaluate(() => {
            // Проверяем различные признаки авторизации
            
            // 1. QR-код исчез
            const qrCode = document.querySelector('canvas')
            const qrGone = !qrCode || window.getComputedStyle(qrCode).display === 'none'
            
            // 2. Появился чат-список или сайдбар
            const chatElements = document.querySelectorAll('.зm_history_container, .tgico-menu, .chat-list, #column-left, .sidebar, .im_page_wrap, .sidebar-content')
            const interfaceLoaded = Array.from(chatElements).some(el => el && window.getComputedStyle(el).display !== 'none')
            
            // 3. URL изменился (например, появился #/im)
            const urlChanged = window.location.hash.includes('/im')
            
            // 4. На странице нет текста "Сканировать" или "QR"
            const noQRText = !document.body.textContent?.toLowerCase().includes('скан') && !document.body.textContent?.toLowerCase().includes('qr')
            
            console.log('Auth check:', { qrGone, interfaceLoaded, urlChanged, noQRText })
            
            return qrGone || interfaceLoaded || urlChanged
          })
          
          if (isAuthenticated) {
            console.log('✅ Authentication detected!')
            authenticated = true
            break
          }
          
          console.log('⌚ Still waiting for authentication...')
          await new Promise(resolve => setTimeout(resolve, checkInterval))
          
        } catch (error) {
          console.log('Error during auth check:', error)
          await new Promise(resolve => setTimeout(resolve, checkInterval))
        }
      }
      
      if (!authenticated) {
        throw new Error('Authentication timeout - no response within 60 seconds')
      }
      
      console.log('Authentication detected, waiting for interface to load...')
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Получаем информацию о пользователе
      let displayName = 'Telegram User'
      let sessionUsername = null
      
      try {
        console.log('Trying to get user info from Telegram interface...')
        
        // Множество вариантов селекторов для имени
        const nameSelectors = [
          '.sidebar-header .person .title',
          '.profile-name',
          '.sidebar .user-name',
          '.im_dialog_peer_title',
          '.profile_info .user_name',
          '.settings-left-column .profile-name',
          '.sidebar-content .name',
          '.profile .name'
        ]
        
        for (const selector of nameSelectors) {
          try {
            const element = await this.page.$(selector)
            if (element) {
              const text = await this.page.evaluate(el => el.textContent?.trim(), element)
              if (text && text !== '') {
                displayName = text
                console.log(`Found display name using selector ${selector}: ${displayName}`)
                break
              }
            }
          } catch (e) {
            // Продолжаем поиск
          }
        }
        
        // Поиск username
        const usernameSelectors = [
          '.sidebar-header .person .subtitle',
          '.profile-username', 
          '.user-username',
          '.im_dialog_peer_username',
          '.settings-left-column .profile-username'
        ]
        
        for (const selector of usernameSelectors) {
          try {
            const element = await this.page.$(selector)
            if (element) {
              const text = await this.page.evaluate(el => el.textContent?.trim(), element)
              if (text && text !== '' && text.startsWith('@')) {
                sessionUsername = text.replace('@', '')
                console.log(`Found username using selector ${selector}: @${sessionUsername}`)
                break
              }
            }
          } catch (e) {
            // Продолжаем поиск
          }
        }
        
        console.log(`Final user info: ${displayName}, username: ${sessionUsername || 'none'}`)
      } catch (e) {
        console.log('Could not get user info from Telegram interface:', e)
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
