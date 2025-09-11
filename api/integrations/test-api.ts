// Простой API для тестирования интеграций
// В реальном проекте это будет serverless function или Express.js routes

import { integrationManagerExtended } from '../../services/integrations/integration-manager'
import { IntegrationType } from '@prisma/client'

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export interface QRAuthStartRequest {
  companyId: string
  integrationType: 'TELEGRAM' | 'WHATSAPP'
}

export interface SendMessageRequest {
  integrationId: string
  integrationType: 'TELEGRAM' | 'WHATSAPP'
  recipient: string
  message: string
}

// Начать QR-авторизацию
export async function startQRAuth(request: QRAuthStartRequest): Promise<APIResponse> {
  try {
    const response = await integrationManagerExtended.initializeQRAuth({
      companyId: request.companyId,
      integrationType: request.integrationType as IntegrationType
    })

    return {
      success: true,
      data: {
        integrationId: response.integrationId,
        qrCode: response.qrCode,
        expiresAt: response.expiresAt,
        status: response.status
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

// Проверить статус авторизации
export async function getAuthStatus(integrationId: string, integrationType: 'TELEGRAM' | 'WHATSAPP'): Promise<APIResponse> {
  try {
    const status = await integrationManagerExtended.getIntegrationStatus(
      integrationId,
      integrationType as IntegrationType
    )

    return {
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

// Отправить сообщение
export async function sendMessage(request: SendMessageRequest): Promise<APIResponse> {
  try {
    const result = await integrationManagerExtended.sendMessage(
      request.integrationId,
      request.integrationType as IntegrationType,
      request.recipient,
      request.message
    )

    return {
      success: result.success,
      data: result,
      error: result.error,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

// Получить список интеграций компании
export async function getCompanyIntegrations(companyId: string): Promise<APIResponse> {
  try {
    const integrations = await integrationManagerExtended.getCompanyIntegrations(companyId)

    return {
      success: true,
      data: { integrations },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

// Отключить интеграцию
export async function disconnectIntegration(integrationId: string, integrationType: 'TELEGRAM' | 'WHATSAPP'): Promise<APIResponse> {
  try {
    await integrationManagerExtended.disconnectIntegration(
      integrationId,
      integrationType as IntegrationType
    )

    return {
      success: true,
      data: { message: 'Integration disconnected successfully' },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

// Простой HTTP сервер для тестирования (только для разработки)
export class TestAPIServer {
  private port: number

  constructor(port: number = 3001) {
    this.port = port
  }

  // Простая реализация HTTP сервера для тестирования
  start() {
    console.log(`Test API Server would start on port ${this.port}`)
    console.log('Available endpoints:')
    console.log('POST /api/integrations/qr/start - Start QR auth')
    console.log('GET /api/integrations/qr/:id/status - Check auth status')
    console.log('POST /api/integrations/message/send - Send message')
    console.log('GET /api/integrations/company/:id - Get company integrations')
    console.log('DELETE /api/integrations/:id - Disconnect integration')
  }
}

// Экспорт для использования в тестах
export const testAPI = {
  startQRAuth,
  getAuthStatus,
  sendMessage,
  getCompanyIntegrations,
  disconnectIntegration
}
