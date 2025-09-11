import { prisma } from '../../lib/prisma'
import { WhatsAppWebManager } from './whatsapp-web-manager'
import { TelegramWebManager } from './telegram-web-manager'
import { IntegrationStatus, IntegrationType } from '@prisma/client'

export interface QRAuthRequest {
  companyId: string
  integrationType: IntegrationType
  integrationId?: string // Если не указан, создается новый
}

export interface QRAuthResponse {
  integrationId: string
  qrCode: string
  expiresAt: Date
  status: string
}

export interface IntegrationSummary {
  id: string
  type: IntegrationType
  status: IntegrationStatus
  displayName?: string
  lastCheckedAt?: Date
  lastError?: string
  isActive: boolean
}

export class IntegrationManager {
  
  // Создание новой интеграции и генерация QR-кода
  async initializeQRAuth(request: QRAuthRequest): Promise<QRAuthResponse> {
    const { companyId, integrationType, integrationId } = request

    let currentIntegrationId = integrationId

    // Если integration ID не указан, создаем новую интеграцию
    if (!currentIntegrationId) {
      if (integrationType === IntegrationType.WHATSAPP) {
        const integration = await prisma.whatsAppIntegration.create({
          data: {
            companyId,
            connectionStatus: 'initializing',
            status: IntegrationStatus.DISCONNECTED
          }
        })
        currentIntegrationId = integration.id
      } else if (integrationType === IntegrationType.TELEGRAM) {
        const integration = await prisma.telegramIntegration.create({
          data: {
            companyId,
            connectionStatus: 'initializing',
            status: IntegrationStatus.DISCONNECTED
          }
        })
        currentIntegrationId = integration.id
      }
    }

    if (!currentIntegrationId) {
      throw new Error(`Failed to create ${integrationType} integration`)
    }

    // Генерируем QR-код
    let manager: WhatsAppWebManager | TelegramWebManager
    let qrCode: string

    if (integrationType === IntegrationType.WHATSAPP) {
      manager = new WhatsAppWebManager(companyId)
      qrCode = await manager.generateQRCode(currentIntegrationId)
    } else if (integrationType === IntegrationType.TELEGRAM) {
      manager = new TelegramWebManager(companyId)
      qrCode = await manager.generateQRCode(currentIntegrationId)
    } else {
      throw new Error(`Unsupported integration type: ${integrationType}`)
    }

    return {
      integrationId: currentIntegrationId,
      qrCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 минут
      status: 'waiting_qr'
    }
  }

  // Ожидание завершения авторизации
  async waitForQRAuth(integrationId: string, integrationType: IntegrationType): Promise<boolean> {
    const companyIntegration = await this.getCompanyIdFromIntegration(integrationId, integrationType)
    if (!companyIntegration) {
      throw new Error('Integration not found')
    }

    let manager: WhatsAppWebManager | TelegramWebManager

    if (integrationType === IntegrationType.WHATSAPP) {
      manager = new WhatsAppWebManager(companyIntegration.companyId)
    } else if (integrationType === IntegrationType.TELEGRAM) {
      manager = new TelegramWebManager(companyIntegration.companyId)
    } else {
      throw new Error(`Unsupported integration type: ${integrationType}`)
    }

    try {
      const success = await manager.waitForAuthentication(integrationId)
      return success
    } finally {
      // Очищаем ресурсы
      await manager.cleanup()
    }
  }

  // Получение статуса интеграции
  async getIntegrationStatus(integrationId: string, integrationType: IntegrationType): Promise<{
    status: IntegrationStatus
    connectionStatus?: string
    qrCode?: string
    expiresAt?: Date
  }> {
    if (integrationType === IntegrationType.WHATSAPP) {
      const integration = await prisma.whatsAppIntegration.findUnique({
        where: { id: integrationId }
      })
      return {
        status: integration?.status || IntegrationStatus.DISCONNECTED,
        connectionStatus: integration?.connectionStatus || undefined,
        qrCode: integration?.qrCodeData || undefined,
        expiresAt: integration?.qrCodeExpiresAt || undefined
      }
    } else if (integrationType === IntegrationType.TELEGRAM) {
      const integration = await prisma.telegramIntegration.findUnique({
        where: { id: integrationId }
      })
      return {
        status: integration?.status || IntegrationStatus.DISCONNECTED,
        connectionStatus: integration?.connectionStatus || undefined,
        qrCode: integration?.qrCodeData || undefined,
        expiresAt: integration?.qrCodeExpiresAt || undefined
      }
    }
    
    throw new Error(`Unsupported integration type: ${integrationType}`)
  }

  // Получение всех интеграций компании
  async getCompanyIntegrations(companyId: string): Promise<IntegrationSummary[]> {
    const [telegramIntegrations, whatsappIntegrations] = await Promise.all([
      prisma.telegramIntegration.findMany({
        where: { companyId }
      }),
      prisma.whatsAppIntegration.findMany({
        where: { companyId }
      })
    ])

    const integrations: IntegrationSummary[] = []

    // Telegram интеграции
    telegramIntegrations.forEach(integration => {
      integrations.push({
        id: integration.id,
        type: IntegrationType.TELEGRAM,
        status: integration.status,
        displayName: integration.displayName || undefined,
        lastCheckedAt: integration.lastCheckedAt || undefined,
        lastError: integration.lastError || undefined,
        isActive: integration.status === IntegrationStatus.CONNECTED
      })
    })

    // WhatsApp интеграции
    whatsappIntegrations.forEach(integration => {
      integrations.push({
        id: integration.id,
        type: IntegrationType.WHATSAPP,
        status: integration.status,
        displayName: integration.displayName || undefined,
        lastCheckedAt: integration.lastCheckedAt || undefined,
        lastError: integration.lastError || undefined,
        isActive: integration.status === IntegrationStatus.CONNECTED
      })
    })

    return integrations
  }

  // Отключение интеграции
  async disconnectIntegration(integrationId: string, integrationType: IntegrationType): Promise<void> {
    if (integrationType === IntegrationType.WHATSAPP) {
      await prisma.whatsAppIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.DISCONNECTED,
          encryptedWebSession: null,
          qrCodeData: null,
          connectionStatus: 'disconnected'
        }
      })
    } else if (integrationType === IntegrationType.TELEGRAM) {
      await prisma.telegramIntegration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.DISCONNECTED,
          encryptedWebSession: null,
          qrCodeData: null,
          connectionStatus: 'disconnected'
        }
      })
    }

    // Логируем
    await prisma.integrationLog.create({
      data: {
        companyId: await this.getCompanyIdFromIntegration(integrationId, integrationType).then(r => r?.companyId || ''),
        integrationType,
        integrationId,
        action: 'disconnect',
        status: 'SUCCESS',
        message: `${integrationType} integration disconnected`
      }
    })
  }

  // Вспомогательный метод для получения companyId
  private async getCompanyIdFromIntegration(integrationId: string, integrationType: IntegrationType): Promise<{companyId: string} | null> {
    if (integrationType === IntegrationType.WHATSAPP) {
      const integration = await prisma.whatsAppIntegration.findUnique({
        where: { id: integrationId },
        select: { companyId: true }
      })
      return integration
    } else if (integrationType === IntegrationType.TELEGRAM) {
      const integration = await prisma.telegramIntegration.findUnique({
        where: { id: integrationId },
        select: { companyId: true }
      })
      return integration
    }
    return null
  }
}

// Singleton instance
export const integrationManager = new IntegrationManager()

import { WhatsAppMessageSender, TelegramMessageSender, MessageResult } from './message-sender'

// Добавляем методы в класс IntegrationManager
export interface IntegrationManagerExtensions {
  sendMessage(integrationId: string, integrationType: IntegrationType, recipient: string, message: string): Promise<MessageResult>
}

// Расширяем существующий класс
Object.assign(IntegrationManager.prototype, {
  async sendMessage(integrationId: string, integrationType: IntegrationType, recipient: string, message: string): Promise<MessageResult> {
    try {
      if (integrationType === IntegrationType.WHATSAPP) {
        const sender = new WhatsAppMessageSender()
        return await sender.sendMessage(integrationId, recipient, message)
      } else if (integrationType === IntegrationType.TELEGRAM) {
        const sender = new TelegramMessageSender()
        return await sender.sendMessage(integrationId, recipient, message)
      } else {
        throw new Error(`Message sending not supported for ${integrationType}`)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    }
  }
} as IntegrationManagerExtensions)

// Обновляем тип singleton instance
export const integrationManagerExtended = integrationManager as IntegrationManager & IntegrationManagerExtensions
