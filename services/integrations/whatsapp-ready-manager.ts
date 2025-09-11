import pkg from 'whatsapp-web.js'
const { Client, LocalAuth, RemoteAuth } = pkg
import { prisma } from '../../lib/prisma.ts'
import { IntegrationStatus, IntegrationType } from '@prisma/client'
import * as QRCode from 'qrcode'
import * as fs from 'fs'
import * as path from 'path'

export class WhatsAppReadyManager {
  private client: Client | null = null
  private isReady = false
  private companyId: string
  private integrationId: string | null = null

  // Singleton pattern
  private static instances = new Map<string, WhatsAppReadyManager>()

  constructor(companyId: string) {
    this.companyId = companyId
  }

  static getInstance(companyId: string): WhatsAppReadyManager {
    if (!WhatsAppReadyManager.instances.has(companyId)) {
      WhatsAppReadyManager.instances.set(companyId, new WhatsAppReadyManager(companyId))
    }
    return WhatsAppReadyManager.instances.get(companyId)!
  }

  // Инициализация клиента с сохранением сессии
  async initialize(integrationId: string): Promise<void> {
    this.integrationId = integrationId

    // Путь для сохранения сессии
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session_${this.companyId}`)

    console.log('🚀 Инициализация WhatsApp клиента с LocalAuth...')
    console.log(`📂 Сессия будет сохранена в: ${sessionPath}`)

    this.client = new Client({
      authStrategy: new LocalAuth({ 
        clientId: this.companyId,
        dataPath: sessionPath 
      }),
      puppeteer: {
        headless: true,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    if (!this.client) return

    // QR код для авторизации
    this.client.on('qr', async (qr) => {
      console.log('📱 Получен QR код для авторизации WhatsApp')
      
      try {
        // Генерируем QR код
        const qrCodeDataURL = await QRCode.toDataURL(qr)
        
        // Сохраняем в базу
        if (this.integrationId) {
          await prisma.whatsAppIntegration.update({
            where: { id: this.integrationId },
            data: {
              qrCodeData: qrCodeDataURL,
              qrCodeExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 минут
              connectionStatus: 'qr_pending',
              status: IntegrationStatus.AUTHENTICATING
            }
          })

          console.log('✅ QR код сохранен в базу данных')
        }
      } catch (error) {
        console.error('❌ Ошибка сохранения QR кода:', error)
      }
    })

    // Успешная авторизация
    this.client.on('authenticated', async () => {
      console.log('✅ WhatsApp аутентификация прошла успешно!')
      
      if (this.integrationId) {
        await prisma.whatsAppIntegration.update({
          where: { id: this.integrationId },
          data: {
            status: IntegrationStatus.CONNECTED,
            connectionStatus: 'authenticated',
            qrCodeData: null,
            qrCodeExpiresAt: null,
            lastCheckedAt: new Date()
          }
        })
      }
    })

    // Клиент готов к работе
    this.client.on('ready', async () => {
      console.log('🎉 WhatsApp клиент готов к отправке сообщений!')
      this.isReady = true

      if (this.integrationId) {
        // Получаем информацию о пользователе
        const info = this.client!.info
        
        await prisma.whatsAppIntegration.update({
          where: { id: this.integrationId },
          data: {
            status: IntegrationStatus.CONNECTED,
            connectionStatus: 'connected',
            displayName: info.pushname || 'WhatsApp User',
            phoneNumber: info.wid.user,
            lastCheckedAt: new Date()
          }
        })

        // Логируем успешное подключение
        await prisma.integrationLog.create({
          data: {
            companyId: this.companyId,
            integrationType: IntegrationType.WHATSAPP,
            integrationId: this.integrationId,
            action: 'ready',
            status: 'SUCCESS',
            message: `WhatsApp ready for ${info.pushname} (${info.wid.user})`
          }
        })
      }
    })

    // Отключение
    this.client.on('disconnected', async (reason) => {
      console.log('❌ WhatsApp отключен:', reason)
      this.isReady = false
      
      if (this.integrationId) {
        await prisma.whatsAppIntegration.update({
          where: { id: this.integrationId },
          data: {
            status: IntegrationStatus.DISCONNECTED,
            connectionStatus: 'disconnected',
            lastError: `Disconnected: ${reason}`
          }
        })
      }
    })

    // Ошибки авторизации
    this.client.on('auth_failure', async (message) => {
      console.error('❌ Ошибка авторизации WhatsApp:', message)
      
      if (this.integrationId) {
        await prisma.whatsAppIntegration.update({
          where: { id: this.integrationId },
          data: {
            status: IntegrationStatus.ERROR,
            connectionStatus: 'auth_failure',
            lastError: `Authentication failed: ${message}`
          }
        })
      }
    })
  }

  // Запуск клиента
  async start(): Promise<void> {
    if (!this.client) {
      throw new Error('Клиент не инициализирован. Вызовите initialize() сначала.')
    }

    console.log('🔄 Запуск WhatsApp клиента...')
    await this.client.initialize()
  }

  // Отправка сообщения
  async sendMessage(recipient: string, message: string): Promise<boolean> {
    if (!this.client || !this.isReady) {
      console.error('❌ WhatsApp клиент не готов')
      return false
    }

    try {
      console.log(`📤 Отправка сообщения на ${recipient}: ${message.substring(0, 50)}...`)

      // Форматируем номер для WhatsApp
      let formattedNumber = recipient.replace(/\D/g, '')
      if (!formattedNumber.endsWith('@c.us')) {
        formattedNumber += '@c.us'
      }

      // Отправляем сообщение
      const sentMessage = await this.client.sendMessage(formattedNumber, message)
      
      console.log('✅ Сообщение WhatsApp отправлено успешно!')
      
      // Обновляем статистику
      if (this.integrationId) {
        await prisma.whatsAppIntegration.update({
          where: { id: this.integrationId },
          data: {
            messagesSent: { increment: 1 },
            lastCheckedAt: new Date()
          }
        })

        // Логируем отправку
        await prisma.integrationLog.create({
          data: {
            companyId: this.companyId,
            integrationType: IntegrationType.WHATSAPP,
            integrationId: this.integrationId,
            action: 'send_message',
            status: 'SUCCESS',
            message: `Message sent to ${recipient}: ${message.substring(0, 100)}`
          }
        })
      }

      return true
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error)
      
      if (this.integrationId) {
        await prisma.integrationLog.create({
          data: {
            companyId: this.companyId,
            integrationType: IntegrationType.WHATSAPP,
            integrationId: this.integrationId,
            action: 'send_message_failed',
            status: 'ERROR',
            message: `Failed to send to ${recipient}: ${error}`,
            errorDetails: { error: error instanceof Error ? error.message : String(error) }
          }
        })
      }
      
      return false
    }
  }

  // Проверка статуса
  async isConnected(): Promise<boolean> {
    return this.client !== null && this.isReady
  }

  // Получение информации о клиенте
  async getClientInfo(): Promise<any> {
    if (!this.client || !this.isReady) {
      return null
    }
    return this.client.info
  }

  // Остановка клиента
  async stop(): Promise<void> {
    if (this.client) {
      await this.client.destroy()
      this.client = null
      this.isReady = false
    }
  }

  // Уничтожение экземпляра
  static async destroyInstance(companyId: string): Promise<void> {
    const instance = WhatsAppReadyManager.instances.get(companyId)
    if (instance) {
      await instance.stop()
      WhatsAppReadyManager.instances.delete(companyId)
      console.log(`🗑️ WhatsApp экземпляр для компании ${companyId} уничтожен`)
    }
  }

  // Чтение последних сообщений
  async getRecentMessages(limit: number = 10): Promise<any[]> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp клиент не готов')
    }

    try {
      console.log(`📬 Получение последних ${limit} сообщений...`)
      
      const chats = await this.client.getChats()
      const messages: any[] = []
      
      // Получаем сообщения из первых 5 активных чатов
      for (const chat of chats.slice(0, 5)) {
        try {
          const chatMessages = await chat.fetchMessages({ limit: Math.min(limit, 3) })
          
          for (const msg of chatMessages) {
            messages.push({
              chatId: chat.id._serialized,
              chatName: chat.name || chat.id.user,
              messageId: msg.id._serialized,
              from: msg.from,
              to: msg.to, 
              body: msg.body,
              timestamp: new Date(msg.timestamp * 1000),
              isFromMe: msg.fromMe,
              type: msg.type,
              hasMedia: msg.hasMedia
            })
          }
        } catch (error) {
          console.warn(`⚠️ Ошибка получения сообщений из чата ${chat.name}:`, error)
        }
      }
      
      // Сортируем по времени (новые сначала)
      messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      console.log(`✅ Получено ${messages.length} сообщений из WhatsApp`)
      return messages.slice(0, limit)
      
    } catch (error) {
      console.error('❌ Ошибка получения сообщений:', error)
      throw error
    }
  }

  // Получение списка чатов
  async getChatsList(): Promise<any[]> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp клиент не готов')
    }

    try {
      console.log('📂 Получение списка чатов...')
      
      const chats = await this.client.getChats()
      const chatsList = []
      
      for (const chat of chats.slice(0, 20)) { // Первые 20 чатов
        try {
          const lastMessage = await chat.fetchMessages({ limit: 1 })
          
          chatsList.push({
            id: chat.id._serialized,
            name: chat.name || chat.id.user || 'Без имени',
            isGroup: chat.isGroup,
            unreadCount: chat.unreadCount,
            lastMessage: lastMessage.length > 0 ? {
              body: lastMessage[0].body,
              timestamp: new Date(lastMessage[0].timestamp * 1000),
              fromMe: lastMessage[0].fromMe
            } : null,
            timestamp: chat.timestamp ? new Date(chat.timestamp * 1000) : null
          })
        } catch (error) {
          console.warn(`⚠️ Ошибка получения данных чата ${chat.name}:`, error)
        }
      }
      
      // Сортируем по времени последнего сообщения
      chatsList.sort((a, b) => {
        const aTime = a.timestamp || new Date(0)
        const bTime = b.timestamp || new Date(0) 
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
      
      console.log(`✅ Получен список из ${chatsList.length} чатов`)
      return chatsList
      
    } catch (error) {
      console.error('❌ Ошибка получения списка чатов:', error)
      throw error
    }
  }

  // Получение всех активных экземпляров
  static getActiveInstances(): { [companyId: string]: { isReady: boolean, hasClient: boolean } } {
    const stats: { [companyId: string]: { isReady: boolean, hasClient: boolean } } = {}
    
    for (const [companyId, instance] of WhatsAppReadyManager.instances) {
      stats[companyId] = {
        isReady: instance.isReady,
        hasClient: instance.client !== null
      }
    }
    
    return stats
  }
}
