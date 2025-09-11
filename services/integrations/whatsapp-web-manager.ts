import { WebSessionManager, WebSession, QRCodeData } from './web-session-manager'
import { prisma } from '../../lib/prisma'
import { IntegrationStatus, IntegrationType } from '@prisma/client'
import * as QRCode from 'qrcode'
import puppeteer, { Browser, Page } from 'puppeteer'

export class WhatsAppWebManager extends WebSessionManager {
  private browser: Browser | null = null
  private page: Page | null = null
  private isAuthenticated = false
  private authenticationPromise: Promise<boolean> | null = null
  private static instances = new Map<string, WhatsAppWebManager>()

  constructor(companyId: string) {
    super(companyId, IntegrationType.WHATSAPP)
  }
  
  // Singleton pattern для каждой компании
  static getInstance(companyId: string): WhatsAppWebManager {
    if (!WhatsAppWebManager.instances.has(companyId)) {
      WhatsAppWebManager.instances.set(companyId, new WhatsAppWebManager(companyId))
    }
    return WhatsAppWebManager.instances.get(companyId)!
  }
  
  // Проверка, что сессия активна
  private async checkSessionActive(): Promise<boolean> {
    if (!this.page || !this.browser) return false
    
    try {
      // Проверяем, открыта ли страница
      const url = this.page.url()
      if (!url.includes('web.whatsapp.com')) return false
      
      // Проверяем, не показывается ли QR-код
      const qrExists = await this.page.$('canvas[aria-label*="QR"], canvas[aria-label*="Scan"]')
      return !qrExists // Если QR-кода нет, значит авторизованы
      
    } catch (error) {
      return false
    }
  }
  
  // Инициализация или восстановление долгоживущей сессии
  async ensureSession(integrationId: string): Promise<boolean> {
    // Если уже авторизованы и сессия активна
    if (this.isAuthenticated && await this.checkSessionActive()) {
      console.log('✅ Используем существующую сессию WhatsApp')
      return true
    }
    
    // Если уже идет процесс авторизации, ждем его
    if (this.authenticationPromise) {
      console.log('⏳ Ожидаем завершения авторизации...')
      return await this.authenticationPromise
    }
    
    // Запускаем новую авторизацию
    this.authenticationPromise = this.initializePersistentSession(integrationId)
    
    try {
      const result = await this.authenticationPromise
      this.isAuthenticated = result
      return result
    } finally {
      this.authenticationPromise = null
    }
  }

  // Инициализация долгоживущей сессии с автоматическим восстановлением
  async initializePersistentSession(integrationId: string): Promise<boolean> {
    try {
      console.log('🔄 Инициализация долгоживущей сессии WhatsApp...')
      
      // Сначала пытаемся восстановить существующую сессию
      const sessionRestored = await this.tryRestorePersistentSession(integrationId)
      if (sessionRestored) {
        console.log('✅ Сессия успешно восстановлена из сохраненных данных')
        this.startHealthMonitoring(integrationId)
        return true
      }
      
      console.log('⚠️ Не удалось восстановить сессию, запускаем новую авторизацию...')
      
      // Если восстановить не удалось, запускаем новую авторизацию
      const qrCode = await this.generateQRCode(integrationId)
      const authResult = await this.waitForAuthentication(integrationId)
      
      if (authResult) {
        console.log('✅ Новая сессия создана успешно')
        this.startHealthMonitoring(integrationId)
        return true
      }
      
      return false
      
    } catch (error) {
      console.error('❌ Ошибка инициализации долгоживущей сессии:', error)
      
      await prisma.integrationLog.create({
        data: {
          companyId: this.companyId,
          integrationType: IntegrationType.WHATSAPP,
          integrationId,
          action: 'persistent_session_init_failed',
          status: 'ERROR',
          message: `Failed to initialize persistent session: ${error}`,
          errorDetails: { error: error instanceof Error ? error.message : String(error) }
        }
      })
      
      return false
    }
  }

  // Попытка восстановления долгоживущей сессии
  private async tryRestorePersistentSession(integrationId: string): Promise<boolean> {
    try {
      console.log('🔍 Пытаемся восстановить долгоживущую сессию...')
      
      // Загружаем сохраненную сессию
      const sessionData = await this.loadSession(integrationId)
      if (!sessionData) {
        console.log('❌ Сохраненная сессия не найдена')
        return false
      }
      
      // Проверяем, не истекла ли сессия (максимум 90 дней)
      const lastActivityTime = sessionData.lastActivity instanceof Date ? 
        sessionData.lastActivity.getTime() : 
        new Date(sessionData.lastActivity).getTime()
      const sessionAge = Date.now() - lastActivityTime
      const maxAge = 90 * 24 * 60 * 60 * 1000 // 90 дней в миллисекундах
      
      if (sessionAge > maxAge) {
        console.log('⚠️ Сохраненная сессия слишком старая, требуется новая авторизация')
        return false
      }
      
      console.log(`📅 Возраст сессии: ${Math.round(sessionAge / (24 * 60 * 60 * 1000))} дней`)
      
      // Запускаем браузер в headless режиме для долгоживущей сессии
      this.browser = await puppeteer.launch({
        headless: true, // Для долгоживущих сессий используем headless
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        defaultViewport: sessionData.viewport
      })
      
      this.page = await this.browser.newPage()
      
      // Восстанавливаем сессию
      await this.restoreSessionInBrowser(sessionData)
      
      // Проверяем, что сессия действительно работает
      const isValid = await this.validateRestoredSession()
      
      if (!isValid) {
        console.log('❌ Восстановленная сессия не валидна')
        await this.cleanup()
        return false
      }
      
      console.log('✅ Долгоживущая сессия успешно восстановлена')
      
      // Обновляем информацию в базе данных
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.CONNECTED,
          connectionStatus: 'connected',
          lastCheckedAt: new Date()
        }
      })
      
      return true
      
    } catch (error) {
      console.error('❌ Ошибка восстановления сессии:', error)
      
      // Очищаем ресурсы при ошибке
      await this.cleanup()
      return false
    }
  }

  // Восстановление сессии в браузере
  private async restoreSessionInBrowser(sessionData: WebSession): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')
    
    console.log('🔄 Восстанавливаем сессию в браузере...')
    
    // 1. Устанавливаем user agent
    await this.page.setUserAgent(sessionData.userAgent)
    
    // 2. Устанавливаем cookies ДО перехода на страницу
    if (sessionData.cookies && sessionData.cookies.length > 0) {
      console.log(`📥 Восстанавливаем ${sessionData.cookies.length} cookies`)
      await this.page.setCookie(...sessionData.cookies)
    }
    
    // 3. Настраиваем localStorage и sessionStorage для всех новых документов
    await this.page.evaluateOnNewDocument((data) => {
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
    
    // 4. Переходим на WhatsApp Web
    console.log('🌐 Переходим на WhatsApp Web...')
    await this.page.goto('https://web.whatsapp.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })
    
    // 5. Ждем частичной загрузки и дополнительно восстанавливаем storage
    await new Promise(resolve => setTimeout(resolve, 3000))
    
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
    
    console.log('✅ Сессия восстановлена в браузере')
  }

  // Валидация восстановленной сессии
  private async validateRestoredSession(): Promise<boolean> {
    if (!this.page) return false
    
    try {
      console.log('🔍 Проверяем валидность восстановленной сессии...')
      
      // Ждем до 30 секунд для полной загрузки
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Проверяем, не показывается ли QR-код
      const qrExists = await this.page.$('canvas[aria-label*="QR"], canvas[aria-label*="Scan"]')
      if (qrExists) {
        console.log('❌ QR-код найден - сессия не валидна')
        return false
      }
      
      // Ищем признаки успешно загруженного интерфейса
      const interfaceSelectors = [
        '._2QgSC', 
        '[data-testid="chat-list"]',
        '.app-wrapper-web',
        '[role="main"]',
        '[data-testid="side"]'
      ]
      
      let interfaceFound = false
      for (const selector of interfaceSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 10000 })
          console.log(`✅ Найден элемент интерфейса: ${selector}`)
          interfaceFound = true
          break
        } catch (e) {
          continue
        }
      }
      
      if (!interfaceFound) {
        console.log('⚠️ Основной интерфейс не найден, но QR-кода тоже нет. Возможно, загружается...')
        // Даем еще немного времени
        await new Promise(resolve => setTimeout(resolve, 10000))
        
        // Повторная проверка QR-кода
        const qrExistsAgain = await this.page.$('canvas[aria-label*="QR"], canvas[aria-label*="Scan"]')
        if (qrExistsAgain) {
          console.log('❌ QR-код появился при повторной проверке - сессия не валидна')
          return false
        }
      }
      
      console.log('✅ Сессия валидна - нет QR-кода, интерфейс доступен')
      return true
      
    } catch (error) {
      console.error('❌ Ошибка валидации сессии:', error)
      return false
    }
  }

  // Мониторинг здоровья сессии
  private startHealthMonitoring(integrationId: string): void {
    console.log('💓 Запускаем мониторинг здоровья сессии...')
    
    // Проверяем здоровье каждые 5 минут
    setInterval(async () => {
      try {
        const isHealthy = await this.performHealthCheck(integrationId)
        if (!isHealthy) {
          console.log('⚠️ Сессия нездорова, пытаемся восстановить...')
          await this.handleUnhealthySession(integrationId)
        }
      } catch (error) {
        console.error('❌ Ошибка проверки здоровья сессии:', error)
      }
    }, 5 * 60 * 1000) // 5 минут
    
    // Автосохранение каждые 10 минут
    setInterval(async () => {
      try {
        await this.autoSaveSession(integrationId)
      } catch (error) {
        console.error('❌ Ошибка автосохранения сессии:', error)
      }
    }, 10 * 60 * 1000) // 10 минут
  }

  // Проверка здоровья сессии
  private async performHealthCheck(integrationId: string): Promise<boolean> {
    if (!this.page || !this.browser) {
      console.log('❌ Браузер или страница не активны')
      return false
    }
    
    try {
      // Проверяем, что страница отвечает
      const title = await this.page.title()
      if (!title || title.includes('WhatsApp Web') === false) {
        console.log(`⚠️ Неожиданный title страницы: ${title}`)
        return false
      }
      
      // Проверяем, что нет QR-кода
      const qrExists = await this.page.$('canvas[aria-label*="QR"], canvas[aria-label*="Scan"]')
      if (qrExists) {
        console.log('❌ Найден QR-код - сессия потеряна')
        return false
      }
      
      // Обновляем время последней проверки
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          lastCheckedAt: new Date(),
          connectionStatus: 'connected'
        }
      })
      
      console.log('✅ Health check пройден')
      return true
      
    } catch (error) {
      console.error('❌ Ошибка health check:', error)
      return false
    }
  }

  // Обработка нездоровой сессии
  private async handleUnhealthySession(integrationId: string): Promise<void> {
    console.log('🔧 Обрабатываем нездоровую сессию...')
    
    try {
      // Обновляем статус
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          connectionStatus: 'reconnecting',
          lastError: 'Session became unhealthy, attempting to reconnect'
        }
      })
      
      // Очищаем текущие ресурсы
      await this.cleanup()
      
      // Сбрасываем флаги
      this.isAuthenticated = false
      
      // Пытаемся восстановить сессию
      const restored = await this.tryRestorePersistentSession(integrationId)
      
      if (!restored) {
        console.log('⚠️ Не удалось восстановить сессию, требуется новая авторизация')
        
        await prisma.whatsAppIntegration.update({
          where: { id: integrationId },
          data: {
            status: IntegrationStatus.ERROR,
            connectionStatus: 'authentication_required',
            lastError: 'Session lost, QR code authentication required'
          }
        })
        
        // Логируем событие
        await prisma.integrationLog.create({
          data: {
            companyId: this.companyId,
            integrationType: IntegrationType.WHATSAPP,
            integrationId,
            action: 'session_lost',
            status: 'WARNING',
            message: 'WhatsApp session lost, requires re-authentication'
          }
        })
      } else {
        console.log('✅ Сессия успешно восстановлена')
        this.isAuthenticated = true
      }
      
    } catch (error) {
      console.error('❌ Ошибка обработки нездоровой сессии:', error)
      
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.ERROR,
          connectionStatus: 'error',
          lastError: `Failed to handle unhealthy session: ${error}`
        }
      })
    }
  }

  // Автоматическое сохранение сессии
  private async autoSaveSession(integrationId: string): Promise<void> {
    if (!this.page || !this.isAuthenticated) {
      return
    }
    
    try {
      console.log('💾 Автосохранение сессии...')
      
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
      console.log('✅ Сессия автоматически сохранена')
      
    } catch (error) {
      console.error('❌ Ошибка автосохранения сессии:', error)
    }
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

      // Запускаем мониторинг здоровья для долгоживущей сессии
      console.log('💓 Запускаем мониторинг здоровья сессии...')
      this.startHealthMonitoring(integrationId)
      
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

      // При ошибке все же закрываем браузер
      if (this.browser) {
        await this.browser.close()
        this.browser = null
        this.page = null
      }
      
      return false
    }
    // НЕ закрываем браузер в finally - сохраняем долгоживущую сессию!
  }

  async sendMessage(integrationId: string, recipient: string, message: string): Promise<boolean> {
    console.log(`💬 Отправка WhatsApp сообщения контакту ${recipient}: ${message}`)
    
    try {
      // Убеждаемся, что долгоживущая сессия активна
      const sessionReady = await this.ensureSession(integrationId)
      if (!sessionReady) {
        throw new Error('Не удалось установить сессию WhatsApp. Пожалуйста, пройдите авторизацию.')
      }
      
      if (!this.page) {
        throw new Error('Страница браузера не инициализирована')
      }
      
      console.log('🔍 Используем долгоживущую сессию для отправки сообщения')
      
      // Проверяем, что мы на правильной странице и сессия активна
      const currentUrl = this.page.url()
      if (!currentUrl.includes('web.whatsapp.com')) {
        console.log('🌐 Переходим на WhatsApp Web...')
        await this.page.goto('https://web.whatsapp.com', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        })
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      // Проверяем, что сессия все еще валидна
      const qrExists = await this.page.$('canvas[aria-label*="QR"], canvas[aria-label*="Scan"]')
      if (qrExists) {
        throw new Error('Сессия WhatsApp истекла - нужна повторная авторизация')
      }
      
      // Ждем загрузки интерфейса WhatsApp
      try {
        await this.page.waitForSelector('._2QgSC, [data-testid="chat-list"], .app-wrapper-web', { 
          timeout: 15000 
        })
      } catch (e) {
        console.log('⚠️ Основной селектор не найден, продолжаем...')
      }
      
      console.log('🔍 Интерфейс WhatsApp загружен, ищем контакт...')
      
      // Ищем контакт или создаем новый чат
      await this.searchAndOpenChat(recipient)
      
      // Отправляем сообщение
      await this.sendMessageInChat(message)
      
      // Обновляем статистику
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          messagesSent: { increment: 1 },
          lastCheckedAt: new Date()
        }
      })
      
      // Автосохранение сессии после отправки
      await this.autoSaveSession(integrationId)
      
      console.log('✅ Сообщение WhatsApp успешно отправлено!')
      return true
      
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения WhatsApp:', error)
      
      // Логируем ошибку
      await prisma.integrationLog.create({
        data: {
          companyId: this.companyId,
          integrationType: IntegrationType.WHATSAPP,
          integrationId,
          action: 'send_message_failed',
          status: 'ERROR',
          message: `Ошибка отправки сообщения ${recipient}: ${error}`,
          errorDetails: { error: error instanceof Error ? error.message : String(error) }
        }
      })
      
      // Если ошибка связана с сессией, помечаем как неавторизованные
      if (error instanceof Error && error.message.includes('истекла')) {
        this.isAuthenticated = false
        await prisma.whatsAppIntegration.update({
          where: { id: integrationId },
          data: {
            status: IntegrationStatus.ERROR,
            connectionStatus: 'authentication_required',
            lastError: 'Сессия истекла - нужна повторная авторизация'
          }
        })
      }
      
      return false
    }
    // НЕ закрываем браузер - сохраняем долгоживущую сессию!
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

  // Очистка ресурсов долгоживущей сессии
  async cleanup(): Promise<void> {
    console.log('🧹 Очищаем ресурсы долгоживущей сессии WhatsApp...')
    
    try {
      if (this.page) {
        // Сохраняем сессию перед закрытием (если возможно)
        if (this.isAuthenticated) {
          try {
            console.log('💾 Последнее сохранение сессии...')
            
            const sessionData: WebSession = {
              sessionId: `whatsapp_cleanup_${Date.now()}`,
              cookies: await this.page.cookies(),
              localStorage: await this.page.evaluate(() => ({ ...localStorage })),
              sessionStorage: await this.page.evaluate(() => ({ ...sessionStorage })),
              userAgent: await this.page.evaluate(() => navigator.userAgent),
              viewport: this.page.viewport() || { width: 1366, height: 768 },
              lastActivity: new Date()
            }
            
            // Получаем integrationId из контекста (если доступен)
            // Пока сохраняем с общим ID
            await this.saveSession('cleanup_session', sessionData)
          } catch (e) {
            console.log('⚠️ Не удалось сохранить сессию перед закрытием:', e)
          }
        }
        
        await this.page.close()
        this.page = null
      }
      
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
      
      // Сбрасываем флаги
      this.isAuthenticated = false
      this.authenticationPromise = null
      
      console.log('✅ Ресурсы успешно очищены')
      
    } catch (error) {
      console.error('❌ Ошибка очистки ресурсов:', error)
      
      // Принудительная очистка
      this.page = null
      this.browser = null
      this.isAuthenticated = false
      this.authenticationPromise = null
    }
  }

  // Полное закрытие долгоживущей сессии (для административных целей)
  static async destroyInstance(companyId: string): Promise<void> {
    const instance = WhatsAppWebManager.instances.get(companyId)
    if (instance) {
      await instance.cleanup()
      WhatsAppWebManager.instances.delete(companyId)
      console.log(`🗑️ Экземпляр WhatsAppWebManager для компании ${companyId} уничтожен`)
    }
  }

  // Получение статистики всех активных сессий
  static getActiveSessionsStats(): { [companyId: string]: { isAuthenticated: boolean, hasPage: boolean, hasBrowser: boolean } } {
    const stats: { [companyId: string]: { isAuthenticated: boolean, hasPage: boolean, hasBrowser: boolean } } = {}
    
    for (const [companyId, instance] of WhatsAppWebManager.instances) {
      stats[companyId] = {
        isAuthenticated: instance.isAuthenticated,
        hasPage: instance.page !== null,
        hasBrowser: instance.browser !== null
      }
    }
    
    return stats
  }
}
