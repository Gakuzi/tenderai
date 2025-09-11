import { prisma } from '../lib/prisma';
import { CommunicationChannelType, MessageDirection, MessageStatus } from '@prisma/client';

export interface MessageData {
  platform: CommunicationChannelType;
  messageId?: string;
  direction: MessageDirection;
  status?: MessageStatus;
  
  // Содержимое
  subject?: string;
  body: string;
  hasAttachments?: boolean;
  attachments?: any[];
  
  // Контакты
  fromContact: string;
  toContact: string;
  fromName?: string;
  toName?: string;
  
  // Привязки
  companyId: string;
  supplierId?: string;
  clientRequestId?: string;
  
  // Метаданные
  threadId?: string;
  replyToId?: string;
  initiatedByAgent?: boolean;
  isAutomated?: boolean;
  
  // Временные метки
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

export interface CommunicationContextData {
  clientRequestId: string;
  supplierId: string;
  companyId: string;
  purpose?: string;
  notes?: string;
}

/**
 * Сервис для логирования всех коммуникаций
 */
export class CommunicationLogger {
  
  /**
   * Логирование сообщения
   */
  static async logMessage(data: MessageData): Promise<string> {
    try {
      console.log(`📝 Логирование сообщения: ${data.platform} ${data.direction} от ${data.fromContact} к ${data.toContact}`);
      
      // Проверяем и создаем поставщика если нужно
      if (data.supplierId) {
        await this.ensureSupplierExists(data.supplierId, data.fromContact, data.fromName);
      }
      
      // Создаем сообщение
      const message = await prisma.communicationMessage.create({
        data: {
          platform: data.platform,
          messageId: data.messageId,
          direction: data.direction,
          status: data.status || MessageStatus.SENT,
          
          subject: data.subject,
          body: data.body,
          hasAttachments: data.hasAttachments || false,
          attachments: data.attachments ? JSON.stringify(data.attachments) : null,
          
          fromContact: data.fromContact,
          toContact: data.toContact,
          fromName: data.fromName,
          toName: data.toName,
          
          companyId: data.companyId,
          supplierId: data.supplierId,
          clientRequestId: data.clientRequestId,
          
          threadId: data.threadId,
          replyToId: data.replyToId,
          initiatedByAgent: data.initiatedByAgent || false,
          isAutomated: data.isAutomated || false,
          
          sentAt: data.sentAt || new Date(),
          deliveredAt: data.deliveredAt,
          readAt: data.readAt
        }
      });
      
      // Обновляем контекст коммуникации если есть задача и поставщик
      if (data.clientRequestId && data.supplierId) {
        await this.updateCommunicationContext({
          clientRequestId: data.clientRequestId,
          supplierId: data.supplierId,
          companyId: data.companyId
        });
      }
      
      console.log(`✅ Сообщение сохранено: ${message.id}`);
      return message.id;
      
    } catch (error) {
      console.error('❌ Ошибка логирования сообщения:', error);
      throw error;
    }
  }
  
  /**
   * Создание или обновление контекста коммуникации
   */
  static async updateCommunicationContext(data: CommunicationContextData): Promise<string> {
    try {
      const context = await prisma.communicationContext.upsert({
        where: {
          clientRequestId_supplierId_companyId: {
            clientRequestId: data.clientRequestId,
            supplierId: data.supplierId,
            companyId: data.companyId
          }
        },
        update: {
          messagesCount: {
            increment: 1
          },
          lastMessageAt: new Date(),
          notes: data.notes || undefined
        },
        create: {
          clientRequestId: data.clientRequestId,
          supplierId: data.supplierId,
          companyId: data.companyId,
          purpose: data.purpose,
          notes: data.notes,
          messagesCount: 1,
          lastMessageAt: new Date()
        }
      });
      
      return context.id;
      
    } catch (error) {
      console.error('❌ Ошибка обновления контекста коммуникации:', error);
      throw error;
    }
  }
  
  /**
   * Поиск поставщика по контактным данным
   */
  static async findSupplierByContact(contact: string): Promise<string | null> {
    try {
      // Очищаем номер телефона от лишних символов
      const cleanContact = contact.replace(/\D/g, '');
      
      const supplier = await prisma.supplier.findFirst({
        where: {
          OR: [
            { phone: { contains: cleanContact } },
            { email: contact },
            { phone: contact }
          ]
        },
        select: { id: true }
      });
      
      return supplier?.id || null;
      
    } catch (error) {
      console.error('❌ Ошибка поиска поставщика:', error);
      return null;
    }
  }
  
  /**
   * Создание поставщика если не существует
   */
  private static async ensureSupplierExists(
    supplierId: string, 
    contact: string, 
    name?: string
  ): Promise<void> {
    try {
      const exists = await prisma.supplier.findUnique({
        where: { id: supplierId }
      });
      
      if (!exists) {
        // Пытаемся найти по контакту
        const existing = await this.findSupplierByContact(contact);
        if (!existing) {
          // Создаем нового поставщика
          await prisma.supplier.create({
            data: {
              id: supplierId,
              name: name || `Поставщик ${contact}`,
              inn: `temp_${Date.now()}`, // Временный ИНН
              phone: contact.includes('@') ? '' : contact,
              email: contact.includes('@') ? contact : '',
              contactPerson: name || 'Не указано'
            }
          });
          console.log(`👥 Создан новый поставщик: ${supplierId} (${contact})`);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка создания поставщика:', error);
    }
  }
  
  /**
   * Получение истории сообщений для задачи
   */
  static async getMessagesForRequest(
    clientRequestId: string,
    limit = 50
  ) {
    try {
      const messages = await prisma.communicationMessage.findMany({
        where: {
          clientRequestId
        },
        include: {
          company: {
            select: { name: true }
          },
          supplier: {
            select: { name: true, contactPerson: true }
          }
        },
        orderBy: {
          sentAt: 'desc'
        },
        take: limit
      });
      
      return messages;
      
    } catch (error) {
      console.error('❌ Ошибка получения сообщений для задачи:', error);
      throw error;
    }
  }
  
  /**
   * Получение истории сообщений для поставщика
   */
  static async getMessagesForSupplier(
    supplierId: string,
    limit = 50
  ) {
    try {
      const messages = await prisma.communicationMessage.findMany({
        where: {
          supplierId
        },
        include: {
          company: {
            select: { name: true }
          },
          clientRequest: {
            select: { id: true, tenderDescription: true }
          }
        },
        orderBy: {
          sentAt: 'desc'
        },
        take: limit
      });
      
      return messages;
      
    } catch (error) {
      console.error('❌ Ошибка получения сообщений для поставщика:', error);
      throw error;
    }
  }
  
  /**
   * Получение контекстов коммуникаций для задачи
   */
  static async getCommunicationContextsForRequest(clientRequestId: string) {
    try {
      const contexts = await prisma.communicationContext.findMany({
        where: {
          clientRequestId
        },
        include: {
          supplier: {
            select: { 
              name: true, 
              contactPerson: true, 
              phone: true, 
              email: true 
            }
          },
          company: {
            select: { name: true }
          }
        },
        orderBy: {
          lastMessageAt: 'desc'
        }
      });
      
      return contexts;
      
    } catch (error) {
      console.error('❌ Ошибка получения контекстов для задачи:', error);
      throw error;
    }
  }
  
  /**
   * Статистика коммуникаций для компании
   */
  static async getCompanyCommunicationStats(companyId: string) {
    try {
      const stats = await prisma.$transaction([
        // Общее количество сообщений
        prisma.communicationMessage.count({
          where: { companyId }
        }),
        
        // Количество исходящих сообщений
        prisma.communicationMessage.count({
          where: { 
            companyId,
            direction: MessageDirection.OUTGOING
          }
        }),
        
        // Количество входящих сообщений
        prisma.communicationMessage.count({
          where: { 
            companyId,
            direction: MessageDirection.INCOMING
          }
        }),
        
        // Количество уникальных поставщиков
        prisma.communicationMessage.findMany({
          where: { companyId },
          select: { supplierId: true },
          distinct: ['supplierId']
        }),
        
        // Последние сообщения
        prisma.communicationMessage.findMany({
          where: { companyId },
          take: 5,
          orderBy: { sentAt: 'desc' },
          include: {
            supplier: { select: { name: true } }
          }
        })
      ]);
      
      return {
        totalMessages: stats[0],
        outgoingMessages: stats[1],
        incomingMessages: stats[2],
        uniqueSuppliers: stats[3].filter(s => s.supplierId).length,
        recentMessages: stats[4]
      };
      
    } catch (error) {
      console.error('❌ Ошибка получения статистики:', error);
      throw error;
    }
  }
  
  /**
   * Обновление статуса сообщения
   */
  static async updateMessageStatus(
    messageId: string, 
    status: MessageStatus,
    timestamp?: Date
  ) {
    try {
      const updateData: any = { status };
      
      if (status === MessageStatus.DELIVERED && timestamp) {
        updateData.deliveredAt = timestamp;
      }
      
      if (status === MessageStatus.READ && timestamp) {
        updateData.readAt = timestamp;
      }
      
      await prisma.communicationMessage.update({
        where: { id: messageId },
        data: updateData
      });
      
      console.log(`📊 Статус сообщения обновлен: ${messageId} -> ${status}`);
      
    } catch (error) {
      console.error('❌ Ошибка обновления статуса сообщения:', error);
    }
  }
}
