import { prisma } from '../../lib/prisma'
import { encrypt, decrypt } from '../../lib/encryption'
import { IntegrationStatus, IntegrationType } from '@prisma/client'

// Интерфейс для веб-сессий
export interface WebSession {
  sessionId: string
  cookies: any[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  userAgent: string
  viewport: { width: number; height: number }
  lastActivity: Date
}

// Базовый класс для управления веб-сессиями
export abstract class WebSessionManager {
  protected companyId: string
  protected integrationType: IntegrationType

  constructor(companyId: string, integrationType: IntegrationType) {
    this.companyId = companyId
    this.integrationType = integrationType
  }

  // Сохранение сессии в базу данных
  protected async saveSession(integrationId: string, sessionData: WebSession): Promise<void> {
    try {
      const encryptedSession = encrypt(sessionData)
      
      if (this.integrationType === 'TELEGRAM') {
        await prisma.telegramIntegration.update({
          where: { id: integrationId },
          data: {
            status: IntegrationStatus.CONNECTED,
            lastCheckedAt: new Date(),
            lastError: null,
            // Сохраняем зашифрованную сессию в поле botToken (переименуем позже)
            botToken: encryptedSession
          }
        })
      } else if (this.integrationType === 'WHATSAPP') {
        await prisma.whatsAppIntegration.update({
          where: { id: integrationId },
          data: {
            status: IntegrationStatus.CONNECTED,
            lastCheckedAt: new Date(),
            lastError: null,
            // Сохраняем зашифрованную сессию в поле accessToken
            accessToken: encryptedSession
          }
        })
      }

      // Логируем успешное подключение
      await prisma.integrationLog.create({
        data: {
          companyId: this.companyId,
          integrationType: this.integrationType,
          integrationId,
          action: 'session_saved',
          status: 'SUCCESS',
          message: 'Web session successfully saved and encrypted'
        }
      })
    } catch (error) {
      console.error('Failed to save session:', error)
      throw new Error('Failed to save web session')
    }
  }

  // Загрузка сессии из базы данных
  protected async loadSession(integrationId: string): Promise<WebSession | null> {
    try {
      let encryptedSession: string | null = null

      if (this.integrationType === 'TELEGRAM') {
        const integration = await prisma.telegramIntegration.findUnique({
          where: { id: integrationId }
        })
        encryptedSession = integration?.botToken || null
      } else if (this.integrationType === 'WHATSAPP') {
        const integration = await prisma.whatsAppIntegration.findUnique({
          where: { id: integrationId }
        })
        encryptedSession = integration?.accessToken || null
      }

      if (!encryptedSession) {
        return null
      }

      const sessionData = JSON.parse(decrypt(encryptedSession)) as WebSession
      return sessionData
    } catch (error) {
      console.error('Failed to load session:', error)
      return null
    }
  }

  // Проверка активности сессии
  protected async checkSessionHealth(integrationId: string): Promise<boolean> {
    const session = await this.loadSession(integrationId)
    if (!session) return false

    // Проверяем, не истекла ли сессия (например, старше 7 дней)
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 дней в миллисекундах
    const isExpired = Date.now() - session.lastActivity.getTime() > maxAge

    return !isExpired
  }

  // Абстрактные методы, которые должны реализовать наследники
  abstract generateQRCode(integrationId: string): Promise<string>
  abstract waitForAuthentication(integrationId: string): Promise<boolean>
  abstract sendMessage(integrationId: string, recipient: string, message: string): Promise<boolean>
  abstract isConnected(integrationId: string): Promise<boolean>
}

// Интерфейс QR-кода
export interface QRCodeData {
  qrCode: string // base64 изображение QR-кода
  expiresAt: Date
  sessionId: string
}
