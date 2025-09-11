/**
 * Пример использования умной системы WhatsApp сессий
 * Демонстрирует работу с множественными компаниями и умной обработкой сообщений
 */

async function testSmartWhatsApp() {
  console.log('🧪 Тестирование умной системы WhatsApp сессий\n');
  
  const baseUrl = 'http://localhost:3002/api/whatsapp';
  
  // 1. Загружаем поставщиков в систему
  console.log('1️⃣ Загружаем базу поставщиков...');
  const suppliers = [
    {
      id: 'supplier1',
      name: 'ООО "СтройМатериалы"',
      inn: '1234567890',
      phone: '+79214962555',
      contactPerson: 'Иванов И.И.',
      email: 'ivanov@example.com'
    },
    {
      id: 'supplier2', 
      name: 'АО "ТехСервис"',
      inn: '0987654321',
      phone: '+79119876543',
      contactPerson: 'Петров П.П.',
      email: 'petrov@example.com'
    }
  ];
  
  try {
    const loadResponse = await fetch(`${baseUrl}/suppliers/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suppliers })
    });
    const loadResult = await loadResponse.json();
    console.log('✅ Поставщики загружены:', loadResult.message);
  } catch (error) {
    console.error('❌ Ошибка загрузки поставщиков:', error.message);
  }
  
  // 2. Инициализируем сессии для разных компаний
  const companies = [
    { id: 'company-client1-1', clientId: 'client1', name: 'ООО "Закупки Плюс"' },
    { id: 'company-client1-2', clientId: 'client1', name: 'АО "Тендер Групп"' },
    { id: 'company-client2-1', clientId: 'client2', name: 'ИП Сидоров С.С.' }
  ];
  
  console.log('\n2️⃣ Инициализируем WhatsApp сессии для компаний...');
  for (const company of companies) {
    try {
      const initResponse = await fetch(`${baseUrl}/initialize/${company.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: company.clientId })
      });
      const initResult = await initResponse.json();
      
      if (initResult.success) {
        console.log(`✅ ${company.name} (${company.id}): ${initResult.message}`);
      } else {
        console.log(`❌ ${company.name} (${company.id}): ${initResult.error}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка инициализации ${company.name}:`, error.message);
    }
    
    // Небольшая пауза между инициализациями
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 3. Ждем пока сессии подключатся и показываем статистику
  console.log('\n3️⃣ Ожидаем подключения сессий (30 секунд)...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Показываем общую статистику
  try {
    const statsResponse = await fetch(`${baseUrl}/stats`);
    const stats = await statsResponse.json();
    
    if (stats.success) {
      console.log(`📊 Статистика сессий: ${stats.activeSessions}/${stats.totalSessions} активных`);
      
      for (const [companyId, sessionInfo] of Object.entries(stats.stats)) {
        const status = sessionInfo.connected ? '🟢' : '🔴';
        const chats = sessionInfo.activeChatsCount || 0;
        console.log(`  ${status} ${companyId}: ${sessionInfo.status} (${chats} чатов)`);
        
        if (sessionInfo.info) {
          console.log(`     📱 ${sessionInfo.info.pushname} (${sessionInfo.info.phone})`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error.message);
  }
  
  // 4. Демонстрируем инициирование чатов
  console.log('\n4️⃣ Демонстрируем инициирование чатов агентом...');
  
  // Инициируем чат с поставщиком
  const testCompany = companies[0].id;
  const supplierPhone = '+79214962555'; // Известный поставщик
  const unknownPhone = '+79999999999';  // Неизвестный номер
  
  try {
    // Инициируем чат с поставщиком
    console.log(`📤 Инициируем чат с поставщиком ${supplierPhone}...`);
    const initiateResponse1 = await fetch(`${baseUrl}/initiate/${testCompany}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: supplierPhone,
        message: `🏢 Здравствуйте! Это компания ${companies[0].name}.\n\n📋 Мы ищем поставщика строительных материалов для нашего проекта.\n\nЗаинтересованы в сотрудничестве?`
      })
    });
    const result1 = await initiateResponse1.json();
    
    if (result1.success) {
      console.log(`✅ Чат с поставщиком инициирован: ${result1.messageId}`);
      console.log(`   💬 Чат будет отслеживаться для входящих сообщений`);
    } else {
      console.log(`❌ Ошибка инициирования чата с поставщиком: ${result1.error}`);
    }
    
    // Инициируем чат с неизвестным номером  
    console.log(`📤 Инициируем чат с неизвестным номером ${unknownPhone}...`);
    const initiateResponse2 = await fetch(`${baseUrl}/initiate/${testCompany}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: unknownPhone,
        message: `🏢 Здравствуйте! Это компания ${companies[0].name}.\n\n📞 Мы получили ваш контакт как потенциального поставщика.\n\nМожете рассказать о ваших услугах?`
      })
    });
    const result2 = await initiateResponse2.json();
    
    if (result2.success) {
      console.log(`✅ Чат с неизвестным номером инициирован: ${result2.messageId}`);  
      console.log(`   💬 Чат добавлен в отслеживаемые`);
    } else {
      console.log(`❌ Ошибка инициирования чата: ${result2.error}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка инициирования чатов:', error.message);
  }
  
  // 5. Показываем активные чаты
  console.log('\n5️⃣ Показываем активные чаты...');
  try {
    const chatsResponse = await fetch(`${baseUrl}/active-chats/${testCompany}`);
    const chatsResult = await chatsResponse.json();
    
    if (chatsResult.success) {
      console.log(`📋 Активных чатов для ${testCompany}: ${chatsResult.count}`);
      chatsResult.chats.forEach((chatId, index) => {
        console.log(`  ${index + 1}. ${chatId}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка получения активных чатов:', error.message);
  }
  
  // 6. Устанавливаем обработчик сообщений
  console.log('\n6️⃣ Устанавливаем webhook обработчик сообщений...');
  try {
    const handlerResponse = await fetch(`${baseUrl}/message-handler/${testCompany}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: 'http://localhost:8080/webhook/whatsapp' // Пример webhook URL
      })
    });
    const handlerResult = await handlerResponse.json();
    
    if (handlerResult.success) {
      console.log('✅ Webhook обработчик установлен');
      console.log('   📨 Теперь система будет отправлять уведомления о новых сообщениях');
      console.log('   🤖 Агент будет реагировать только на инициированные или поставщиков чаты');
    }
  } catch (error) {
    console.error('❌ Ошибка установки обработчика:', error.message);
  }
  
  console.log('\n✅ Тестирование завершено!');
  console.log('\n📚 Что протестировано:');
  console.log('  ✓ Загрузка базы поставщиков');
  console.log('  ✓ Инициализация множественных сессий');
  console.log('  ✓ Инициирование чатов агентом');
  console.log('  ✓ Отслеживание активных чатов');
  console.log('  ✓ Установка webhook обработчика');
  console.log('\n🧠 Умная логика:');
  console.log('  • Агент реагирует только на инициированные им чаты');
  console.log('  • Автоматически принимает чаты от известных поставщиков');
  console.log('  • Игнорирует сообщения в неинициированных чатах');
  console.log('  • Поддерживает множественные сессии для разных компаний');
}

// Запускаем тест если сервер доступен
fetch('http://localhost:3002/api/whatsapp/stats')
  .then(() => {
    console.log('🌐 WhatsApp сервер доступен, запускаем тест...\n');
    return testSmartWhatsApp();
  })
  .catch(() => {
    console.error('❌ WhatsApp сервер недоступен. Запустите: npm run whatsapp-server');
  });
