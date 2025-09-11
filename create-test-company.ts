import { prisma } from './lib/prisma'

async function createTestCompany() {
  try {
    // Создаем тестового клиента
    const client = await prisma.client.findFirst({
      where: { email: 'client@tendera.ai' }
    })

    if (!client) {
      console.error('Client not found. Run seed first.')
      return
    }

    // Проверяем, есть ли уже компания
    const existingCompany = await prisma.company.findFirst({
      where: { clientId: client.id }
    })

    if (existingCompany) {
      console.log('Test company already exists:', existingCompany.id)
      return existingCompany.id
    }

    // Создаем компанию
    const company = await prisma.company.create({
      data: {
        name: 'Тестовая компания',
        inn: '1234567890',
        kpp: '123456789',
        isActive: true,
        clientId: client.id
      }
    })

    console.log('Test company created:', company.id)
    return company.id
  } catch (error) {
    console.error('Error creating test company:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestCompany()
