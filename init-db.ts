import { PrismaClient } from '@prisma/client'
import { hashPassword } from './lib/auth'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...')

    // Создаем пользователя администратора
    const admin = await prisma.user.create({
      data: {
        email: 'admin@tendera.ai',
        password: await hashPassword('password'),
        role: 'ADMIN'
      }
    })
    console.log('✅ Admin user created:', admin.email)

    // Создаем тестового клиента
    const client = await prisma.client.create({
      data: {
        name: 'ООО "Тестовая компания"',
        contactPerson: 'Иван Иванов',
        email: 'test@company.ru',
        status: 'ACTIVE',
        balance: 100000,
        user: {
          create: {
            email: 'client@company.ru',
            password: await hashPassword('password'),
            role: 'CLIENT'
          }
        }
      }
    })
    console.log('✅ Test client created:', client.name)

    // Создаем компанию клиента
    const company = await prisma.company.create({
      data: {
        name: 'ООО "Тестовая компания"',
        inn: '1234567890',
        kpp: '123456789',
        isActive: true,
        clientId: client.id
      }
    })
    console.log('✅ Test company created:', company.name, 'ID:', company.id)

    // Создаем тестовые интеграции
    const whatsappIntegration = await prisma.whatsAppIntegration.create({
      data: {
        companyId: company.id,
        status: 'DISCONNECTED',
        connectionStatus: 'disconnected'
      }
    })
    console.log('✅ WhatsApp integration created:', whatsappIntegration.id)

    const telegramIntegration = await prisma.telegramIntegration.create({
      data: {
        companyId: company.id,
        status: 'DISCONNECTED',
        connectionStatus: 'disconnected'
      }
    })
    console.log('✅ Telegram integration created:', telegramIntegration.id)

    console.log('\n🎉 Database initialized successfully!')
    console.log(`Company ID for testing: ${company.id}`)

    return {
      companyId: company.id,
      whatsappIntegrationId: whatsappIntegration.id,
      telegramIntegrationId: telegramIntegration.id
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Запуск скрипта
initializeDatabase().catch(console.error)

export { initializeDatabase }
