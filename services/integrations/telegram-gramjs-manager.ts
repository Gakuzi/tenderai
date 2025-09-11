// Telegram интеграция на основе GramJS (MTProto)
// Заменяет ненадежный Puppeteer подход более стабильным решением

import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { prisma } from '../../lib/prisma'
import { IntegrationStatus, IntegrationType, CommunicationChannelType } from '@prisma/client'
import { CommunicationLogger } from '../communication-logger'

export interface TelegramAuthData {
  phoneNumber: string
  phoneCode?: string
  password?: string
  sessionString?: string
}

export interface TelegramMessageData {
  chatId: string
  message: string
  replyToMessageId?: number
}

export class TelegramGramJSManager {
  private client: TelegramClient | null = null
  private companyId: string
  private integrationId: string | null = null
  private isConnected = false

  constructor(companyId: string) {
    this.companyId = companyId
  }

  // Инициализация клиента с API ключами
  private async initializeClient(sessionString: string = ''): Promise<TelegramClient> {
    const apiId = parseInt(process.env.TELEGRAM_API_ID || '0')
    const apiHash = process.env.TELEGRAM_API_HASH || ''

    if (!apiId || !apiHash) {
      throw new Error('Telegram API keys not found in environment variables')
    }

    const stringSession = new StringSession(sessionString)
    
    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      retryDelay: 1000,
      timeout: 30,
      useWSS: false
    })

    return this.client
  }

  // Начало авторизации - возвращает необходимость ввода кода
  async startAuth(integrationId: string, phoneNumber: string): Promise<{
    success: boolean
    needsCode: boolean
    codeSent: boolean
    error?: string
  }> {
    try {
      this.integrationId = integrationId

      // Обновляем статус в базе
      await prisma.telegramIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.CONNECTING,
          connectionStatus: 'requesting_code',
          lastError: null
        }
      })

      // Инициализируем клиент
      await this.initializeClient()

      if (!this.client) {
        throw new Error('Failed to initialize Telegram client')
      }

      // Подключаемся
      await this.client.connect()

      // Отправляем код на телефон
      const result = await this.client.sendCode({
        phoneNumber: phoneNumber,
        apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
        apiHash: process.env.TELEGRAM_API_HASH || ''
      }, phoneNumber)

      console.log('📱 Telegram code sent to:', phoneNumber)

      // Сохраняем промежуточное состояние
      await prisma.telegramIntegration.update({
        where: { id: integrationId },
        data: {
          connectionStatus: 'code_sent'
        }
      })

      return {
        success: true,
        needsCode: true,
        codeSent: true
      }

    } catch (error) {
      console.error('❌ Telegram auth start failed:', error)

      if (this.integrationId) {
        await prisma.telegramIntegration.update({
          where: { id: this.integrationId },
          data: {
            status: IntegrationStatus.ERROR,
            lastError: error instanceof Error ? error.message : 'Auth failed',
            connectionStatus: 'error'
          }
        })
      }

      return {
        success: false,
        needsCode: false,
        codeSent: false,
        error: error instanceof Error ? error.message : 'Auth failed'
      }
    }
  }

  // Завершение авторизации с кодом
  async completeAuth(authData: TelegramAuthData): Promise<{
    success: boolean
    sessionString?: string
    userInfo?: {
      id: string
      firstName: string
      lastName?: string
      username?: string
      phoneNumber: string
    }
    error?: string
  }> {
    try {
      if (!this.client || !this.integrationId) {
        throw new Error('Client not initialized or integration ID not set')
      }

      // Завершаем авторизацию
      await this.client.start({
        phoneNumber: () => Promise.resolve(authData.phoneNumber),
        password: authData.password ? () => Promise.resolve(authData.password) : undefined,
        phoneCode: () => Promise.resolve(authData.phoneCode || ''),
        onError: (err) => console.error('Telegram auth error:', err)
      })

      // Проверяем авторизацию
      const me = await this.client.getMe() as Api.User

      if (!me) {
        throw new Error('Failed to get user info after auth')
      }

      // Получаем строку сессии
      const sessionString = this.client.session.save() as unknown as string

      const userInfo = {
        id: me.id.toString(),
        firstName: me.firstName || '',
        lastName: me.lastName || undefined,
        username: me.username || undefined,
        phoneNumber: authData.phoneNumber
      }

      this.isConnected = true

      // Сохраняем успешную авторизацию
      await prisma.telegramIntegration.update({
        where: { id: this.integrationId },
        data: {
          status: IntegrationStatus.CONNECTED,
          displayName: `${userInfo.firstName} ${userInfo.lastName || ''}`.trim(),
          sessionUsername: userInfo.username,
          connectionStatus: 'connected',
          lastCheckedAt: new Date(),
          encryptedWebSession: sessionString, // В продакшене нужно шифровать
          webSessionUrl: 'https://web.telegram.org',
          userAgent: 'TelegramGramJS/1.0'
        }
      })

      // Логируем успех
      await prisma.integrationLog.create({
        data: {
          companyId: this.companyId,
          integrationType: IntegrationType.TELEGRAM,
          integrationId: this.integrationId,
          action: 'authentication_success',
          status: 'SUCCESS',
          message: `GramJS authentication completed for ${userInfo.firstName}`
        }
      })

      // Запускаем слушатель сообщений
      this.startMessageListener()

      return {
        success: true,
        sessionString,
        userInfo
      }

    } catch (error) {
      console.error('❌ Telegram auth completion failed:', error)

      if (this.integrationId) {
        await prisma.telegramIntegration.update({
          where: { id: this.integrationId },
          data: {
            status: IntegrationStatus.ERROR,
            lastError: error instanceof Error ? error.message : 'Auth completion failed',
            connectionStatus: 'error'
          }
        })
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Auth completion failed'
      }
    }
  }

  // Восстановление сессии из сохраненной строки
  async restoreSession(integrationId: string, sessionString: string): Promise<boolean> {
    try {
      this.integrationId = integrationId

      await this.initializeClient(sessionString)
      
      if (!this.client) {
        throw new Error('Failed to initialize client')
      }

      await this.client.connect()

      // Проверяем валидность сессии
      const me = await this.client.getMe()
      if (!me) {
        throw new Error('Invalid session - user not found')
      }

      this.isConnected = true

      // Обновляем статус
      await prisma.telegramIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.CONNECTED,
          connectionStatus: 'connected',
          lastCheckedAt: new Date()
        }
      })

      // Запускаем слушатель
      this.startMessageListener()

      console.log('✅ Telegram session restored successfully')
      return true

    } catch (error) {
      console.error('❌ Failed to restore Telegram session:', error)
      
      await prisma.telegramIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.ERROR,
          lastError: error instanceof Error ? error.message : 'Session restore failed'
        }
      })

      return false
    }
  }

  // Получение списка чатов
  async getChats(): Promise<Array<{
    id: string
    title: string
    type: 'private' | 'group' | 'channel'
    lastMessage?: {
      text: string
      date: Date
    }
  }>> {
    if (!this.client || !this.isConnected) {
      throw new Error('Telegram client not connected')
    }

    try {
      const result = await this.client.getDialogs({
        limit: 50
      })

      const chats = result.map(dialog => {
        const chat = dialog.entity
        let title = ''
        let type: 'private' | 'group' | 'channel' = 'private'

        if (chat.className === 'User') {
          const user = chat as Api.User
          title = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown'
          type = 'private'
        } else if (chat.className === 'Chat') {
          const groupChat = chat as Api.Chat
          title = groupChat.title || 'Unknown Group'
          type = 'group'
        } else if (chat.className === 'Channel') {
          const channel = chat as Api.Channel
          title = channel.title || 'Unknown Channel'
          type = 'channel'
        }

        let lastMessage
        if (dialog.message && 'message' in dialog.message) {
          lastMessage = {
            text: dialog.message.message || '',
            date: new Date(dialog.message.date * 1000)
          }
        }

        return {
          id: chat.id.toString(),
          title,
          type,
          lastMessage
        }
      })

      return chats

    } catch (error) {
      console.error('❌ Failed to get Telegram chats:', error)
      throw error
    }
  }

  // Отправка сообщения
  async sendMessage(data: TelegramMessageData): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }> {
    if (!this.client || !this.isConnected) {
      return {
        success: false,
        error: 'Telegram client not connected'
      }
    }

    try {
      const result = await this.client.sendMessage(data.chatId, {
        message: data.message,
        replyTo: data.replyToMessageId
      })

      const messageId = result.id?.toString()

      // Логируем отправленное сообщение
      if (this.integrationId && messageId) {
        await CommunicationLogger.logMessage({
          platform: CommunicationChannelType.TELEGRAM,
          messageId,
          direction: 'OUTGOING',
          body: data.message,
          fromContact: 'self', // От нашего аккаунта
          toContact: data.chatId,
          companyId: this.companyId,
          clientRequestId: undefined, // Может быть добавлено позже
          hasAttachments: false
        })
      }

      return {
        success: true,
        messageId
      }

    } catch (error) {
      console.error('❌ Failed to send Telegram message:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Send failed'
      }
    }
  }

  // Запуск слушателя входящих сообщений
  private startMessageListener(): void {
    if (!this.client) return

    this.client.addEventHandler(async (event) => {
      if (event.className === 'UpdateNewMessage') {
        const message = event.message
        if ('message' in message && message.message) {
          console.log('📨 New Telegram message:', message.message)

          // Логируем входящее сообщение
          if (this.integrationId) {
            try {
              await CommunicationLogger.logMessage({
                platform: CommunicationChannelType.TELEGRAM,
                messageId: message.id?.toString(),
                direction: 'INCOMING',
                body: message.message,
                fromContact: message.fromId?.toString() || 'unknown',
                toContact: 'self',
                companyId: this.companyId,
                sentAt: new Date(message.date * 1000),
                hasAttachments: false
              })
            } catch (error) {
              console.error('❌ Failed to log Telegram message:', error)
            }
          }
        }
      }
    })

    console.log('👂 Telegram message listener started')
  }

  // Отключение клиента
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect()
      this.client = null
      this.isConnected = false
    }

    if (this.integrationId) {
      await prisma.telegramIntegration.update({
        where: { id: this.integrationId },
        data: {
          status: IntegrationStatus.DISCONNECTED,
          connectionStatus: 'disconnected'
        }
      })
    }
  }

  // Проверка подключения
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null
  }
}

// Глобальный менеджер для повторного использования сессий
export class TelegramSessionManager {
  private static managers = new Map<string, TelegramGramJSManager>()

  static async getManager(companyId: string): Promise<TelegramGramJSManager> {
    let manager = this.managers.get(companyId)
    
    if (!manager) {
      manager = new TelegramGramJSManager(companyId)
      this.managers.set(companyId, manager)
    }

    return manager
  }

  static async restoreAllSessions(): Promise<void> {
    console.log('🔄 Restoring all active Telegram sessions...')

    const activeIntegrations = await prisma.telegramIntegration.findMany({
      where: {
        status: IntegrationStatus.CONNECTED,
        encryptedWebSession: { not: null }
      },
      include: {
        company: true
      }
    })

    for (const integration of activeIntegrations) {
      try {
        const manager = await this.getManager(integration.companyId)
        const restored = await manager.restoreSession(
          integration.id,
          integration.encryptedWebSession!
        )

        if (restored) {
          console.log(`✅ Restored Telegram session for company ${integration.company.name}`)
        }
      } catch (error) {
        console.error(`❌ Failed to restore session for ${integration.id}:`, error)
      }
    }
  }

  static cleanup(companyId: string): void {
    const manager = this.managers.get(companyId)
    if (manager) {
      manager.disconnect()
      this.managers.delete(companyId)
    }
  }
}
