const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🚀 Запуск простого теста WhatsApp Web...');

// Создаем клиент с локальной авторизацией
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'tenderai-test'
    }),
    puppeteer: {
        headless: false, // Показываем браузер для отладки
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

// QR код в терминале
client.on('qr', (qr) => {
    console.log('📱 QR код для авторизации:');
    qrcode.generate(qr, {small: true});
    console.log('👆 Отсканируйте этот QR код в WhatsApp');
});

// Авторизация прошла успешно
client.on('authenticated', () => {
    console.log('✅ Авторизация прошла успешно!');
});

// Клиент готов
client.on('ready', () => {
    console.log('🎉 WhatsApp Web клиент готов!');
    console.log('Client info:', client.info);
    
    // Отправляем тестовое сообщение
    setTimeout(() => {
        sendTestMessage();
    }, 3000);
});

// Ошибки
client.on('auth_failure', (message) => {
    console.error('❌ Ошибка авторизации:', message);
});

client.on('disconnected', (reason) => {
    console.log('❌ Отключение:', reason);
});

async function sendTestMessage() {
    try {
        console.log('📤 Отправляем тестовое сообщение...');
        
        const testNumber = '79214962555@c.us'; // Ваш номер
        const message = `🚀 Тест из TenderAI!
        
⏰ Время: ${new Date().toLocaleString()}
✅ WhatsApp Web работает!

Это тестовое сообщение из простого скрипта.`;

        await client.sendMessage(testNumber, message);
        console.log('✅ Сообщение отправлено!');
        
        // Получаем список чатов
        const chats = await client.getChats();
        console.log(`📂 Найдено ${chats.length} чатов`);
        
        // Показываем первые 5 чатов
        console.log('\n📋 Первые 5 чатов:');
        for (let i = 0; i < Math.min(5, chats.length); i++) {
            const chat = chats[i];
            console.log(`${i+1}. ${chat.name || chat.id.user} (${chat.isGroup ? 'Группа' : 'Личный'})`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
    }
}

// Запускаем клиент
console.log('🔄 Инициализация...');
client.initialize();

// Обработчик Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n🛑 Завершение работы...');
    await client.destroy();
    process.exit(0);
});
