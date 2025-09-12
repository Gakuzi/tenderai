// API для управления сессиями мессенджеров
// Позволяет запускать веб-интерфейсы Telegram и WhatsApp прямо из карточки задания

import { integrationManagerExtended } from '../services/integrations/integration-manager'
import { prisma } from '../lib/prisma'
import { IntegrationType, IntegrationStatus } from '@prisma/client'

export interface SessionLaunchRequest {
  requestId: string      // ID клиентского задания
  companyId: string      // ID компании клиента
  platform: 'TELEGRAM' | 'WHATSAPP'
}

export interface SessionLaunchResponse {
  success: boolean
  data?: {
    sessionId: string
    webUrl: string        // URL для открытия веб-интерфейса
    status: string
    needsAuth?: boolean   // Нужна ли авторизация (QR-код)
    qrCode?: string       // QR-код если нужна авторизация
    expiresAt?: string    // Время истечения QR-кода
  }
  error?: string
}

export interface SessionStatusResponse {
  success: boolean
  data?: {
    sessionId: string
    platform: string
    status: IntegrationStatus
    isConnected: boolean
    userInfo?: {
      name: string
      phone?: string
      username?: string
    }
    lastActivity?: string
  }
  error?: string
}

export interface MessageHistoryResponse {
  success: boolean
  data?: {
    messages: Array<{
      id: string
      platform: string
      direction: 'INCOMING' | 'OUTGOING'
      fromContact: string
      toContact: string
      fromName?: string
      toName?: string
      body: string
      sentAt: string
      status: string
      hasAttachments: boolean
    }>
    pagination: {
      total: number
      page: number
      limit: number
    }
  }
  error?: string
}

// Запуск веб-сессии мессенджера
export async function launchMessengerSession(request: SessionLaunchRequest): Promise<SessionLaunchResponse> {
  try {
    const { requestId, companyId, platform } = request

    // Проверяем существование задания и компании
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: requestId },
      include: { company: true, client: true }
    })

    if (!clientRequest) {
      return {
        success: false,
        error: 'Client request not found'
      }
    }

    if (!clientRequest.company || clientRequest.company.id !== companyId) {
      return {
        success: false,
        error: 'Company not found or mismatch'
      }
    }

    // Ищем существующую интеграцию для данной компании
    let integration: any = null
    let integrationId: string

    if (platform === 'WHATSAPP') {
      integration = await prisma.whatsAppIntegration.findFirst({
        where: { companyId },
        orderBy: { updatedAt: 'desc' }
      })
    } else if (platform === 'TELEGRAM') {
      integration = await prisma.telegramIntegration.findFirst({
        where: { companyId },
        orderBy: { updatedAt: 'desc' }
      })
    }

    // Если интеграция существует и подключена
    if (integration && integration.status === IntegrationStatus.CONNECTED) {
      const webUrl = getWebInterfaceUrl(platform, integration.id)
      
      return {
        success: true,
        data: {
          sessionId: integration.id,
          webUrl,
          status: 'connected',
          needsAuth: false
        }
      }
    }

    // Если интеграция не существует или отключена, инициализируем новую сессию
    const qrResponse = await integrationManagerExtended.initializeQRAuth({
      companyId,
      integrationType: platform as IntegrationType,
      integrationId: integration?.id
    })

    integrationId = qrResponse.integrationId
    const webUrl = getWebInterfaceUrl(platform, integrationId)

    // Логируем начало сессии
    await prisma.integrationLog.create({
      data: {
        companyId,
        integrationType: platform as IntegrationType,
        integrationId,
        action: 'launch_session',
        status: 'SUCCESS',
        message: `${platform} session launched for request ${requestId}`
      }
    })

    return {
      success: true,
      data: {
        sessionId: integrationId,
        webUrl,
        status: qrResponse.status,
        needsAuth: true,
        qrCode: qrResponse.qrCode,
        expiresAt: qrResponse.expiresAt.toISOString()
      }
    }

  } catch (error) {
    console.error('Error launching messenger session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Проверка статуса сессии
export async function getSessionStatus(sessionId: string, platform: 'TELEGRAM' | 'WHATSAPP'): Promise<SessionStatusResponse> {
  try {
    const status = await integrationManagerExtended.getIntegrationStatus(
      sessionId,
      platform as IntegrationType
    )

    let userInfo: any = undefined
    let isConnected = false

    if (platform === 'WHATSAPP' && status.status === IntegrationStatus.CONNECTED) {
      const integration = await prisma.whatsAppIntegration.findUnique({
        where: { id: sessionId }
      })
      if (integration) {
        isConnected = true
        userInfo = {
          name: integration.displayName || 'WhatsApp User',
          phone: integration.phoneNumber || undefined
        }
      }
    } else if (platform === 'TELEGRAM' && status.status === IntegrationStatus.CONNECTED) {
      const integration = await prisma.telegramIntegration.findUnique({
        where: { id: sessionId }
      })
      if (integration) {
        isConnected = true
        userInfo = {
          name: integration.displayName || 'Telegram User',
          username: integration.sessionUsername || undefined
        }
      }
    }

    return {
      success: true,
      data: {
        sessionId,
        platform,
        status: status.status,
        isConnected,
        userInfo
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Получение истории сообщений для задания
export async function getRequestMessageHistory(
  requestId: string,
  page: number = 1,
  limit: number = 50
): Promise<MessageHistoryResponse> {
  try {
    const offset = (page - 1) * limit

    const [messages, total] = await Promise.all([
      prisma.communicationMessage.findMany({
        where: { clientRequestId: requestId },
        orderBy: { sentAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          company: {
            select: { name: true }
          }
        }
      }),
      prisma.communicationMessage.count({
        where: { clientRequestId: requestId }
      })
    ])

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      platform: msg.platform,
      direction: msg.direction as 'INCOMING' | 'OUTGOING',
      fromContact: msg.fromContact,
      toContact: msg.toContact,
      fromName: msg.fromName || undefined,
      toName: msg.toName || undefined,
      body: msg.body,
      sentAt: msg.sentAt.toISOString(),
      status: msg.status,
      hasAttachments: msg.hasAttachments
    }))

    return {
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          total,
          page,
          limit
        }
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Отключение сессии
export async function disconnectSession(sessionId: string, platform: 'TELEGRAM' | 'WHATSAPP'): Promise<{success: boolean, error?: string}> {
  try {
    await integrationManagerExtended.disconnectIntegration(
      sessionId,
      platform as IntegrationType
    )

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Вспомогательная функция для генерации URL веб-интерфейса
function getWebInterfaceUrl(platform: 'TELEGRAM' | 'WHATSAPP', sessionId: string): string {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : 'http://localhost:5173'

  if (platform === 'WHATSAPP') {
    return `${baseUrl}/messenger/whatsapp/${sessionId}`
  } else if (platform === 'TELEGRAM') {
    return `${baseUrl}/messenger/telegram/${sessionId}`
  }

  throw new Error(`Unsupported platform: ${platform}`)
}

// Экспорт всех функций
export const messengerSessionsAPI = {
  launchMessengerSession,
  getSessionStatus,
  getRequestMessageHistory,
  disconnectSession
}
