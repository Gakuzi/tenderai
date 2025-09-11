/**
 * CommonJS версия логгера коммуникаций для совместимости с whatsapp-session-manager
 */

/**
 * Сервис для логирования всех коммуникаций
 */
class CommunicationLogger {
  
  /**
   * Логирование сообщения WhatsApp
   */
  static async logWhatsAppMessage(data) {
    try {
      console.log(`📝 Логирование WhatsApp сообщения: ${data.direction} от ${data.fromContact} к ${data.toContact}`);
      
      // В CommonJS среде мы пока только логируем в консоль
      // В будущем здесь будет интеграция с Prisma
      const messageInfo = {
        timestamp: new Date().toISOString(),
        platform: 'WHATSAPP',
        ...data
      };
      
      // Сохраняем в файл для отладки
      const fs = require('fs');
      const logFile = 'whatsapp-communications.log';
      
      fs.appendFileSync(logFile, JSON.stringify(messageInfo) + '\n');
      console.log(`✅ Сообщение залогировано в ${logFile}`);
      
      return `msg_${Date.now()}`;
      
    } catch (error) {
      console.error('❌ Ошибка логирования сообщения:', error);
      return null;
    }
  }
  
  /**
   * Поиск поставщика по номеру телефона (упрощенная версия)
   */
  static findSupplierByPhone(phoneNumber) {
    // Здесь должна быть логика поиска в базе данных
    // Пока возвращаем mock ID для известных номеров
    const knownSuppliers = {
      '79214962555': 'supplier_79214962555',
      '79119876543': 'supplier_79119876543'
    };
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return knownSuppliers[cleanPhone] || null;
  }
  
  /**
   * Получение активного запроса для компании (mock)
   */
  static getActiveRequestForCompany(companyId) {
    // В реальной реализации здесь будет запрос к БД
    // Пока возвращаем mock ID
    return `request_${companyId}_${Date.now()}`;
  }
}

module.exports = { CommunicationLogger };
