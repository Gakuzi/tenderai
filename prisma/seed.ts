import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  // Create staff users
  await prisma.user.create({
    data: {
      email: 'admin@tendera.ai',
      password: await hashPassword('password'),
      role: 'ADMIN',
    }
  })

  await prisma.user.create({
    data: {
      email: 'manager@tendera.ai', 
      password: await hashPassword('password'),
      role: 'MANAGER',
    }
  })

  await prisma.user.create({
    data: {
      email: 'analyst@tendera.ai',
      password: await hashPassword('password'),
      role: 'ANALYST',
    }
  })

  // Create test client with user
  const client = await prisma.client.create({
    data: {
      name: 'ООО "Рога и копыта"',
      contactPerson: 'Иван Петров',
      email: 'client@tendera.ai',
      status: 'ACTIVE',
      balance: 150000,
      user: {
        create: {
          email: 'client@tendera.ai',
          password: await hashPassword('password'),
          role: 'CLIENT'
        }
      },
      integrations: {
        create: {
          telegramBotToken: null
        }
      },
      workModel: {
        create: {
          type: 'PACKAGE',
          packageName: 'Стандарт',
          tenderCount: 10,
          price: 50000,
          tendersRemaining: 8
        }
      },
      companies: {
        create: {
          name: 'Основное ЮЛ',
          inn: '1234567890',
          kpp: '123456789',
          isActive: true,
          platformCredentials: {
            create: {
              platformName: 'zakupki.gov.ru',
              url: 'https://zakupki.gov.ru',
              status: 'CONNECTED',
              sessionData: { token: 'dummy-token' }
            }
          },
          communicationChannels: {
            createMany: {
              data: [
                {
                  type: 'EMAIL',
                  identifier: 'zakupki@roga-kopyta.ru',
                  status: 'CONNECTED'
                },
                {
                  type: 'TELEGRAM',
                  identifier: '+79991234567',
                  status: 'CONNECTED'
                }
              ]
            }
          }
        }
      },
      templates: {
        create: {
          name: 'Стандартный договор',
          type: 'Договор',
          fileUrl: '#'
        }
      },
      transactions: {
        createMany: {
          data: [
            {
              description: 'Пополнение баланса',
              amount: 200000,
              type: 'CREDIT'
            },
            {
              description: 'Оплата участия',
              amount: 50000,
              type: 'DEBIT'
            }
          ]
        }
      }
    }
  })

  // Create some tenders
  await prisma.tender.createMany({
    data: [
      {
        title: 'Поставка офисной мебели',
        clientName: 'ООО "Рога и копыта"',
        nmck: 1500000,
        deadline: new Date('2024-08-01'),
        status: 'OPEN',
        etpUrl: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0123456789012345678'
      },
      {
        title: 'Разработка веб-сайта',
        clientName: 'ИП Иванов',
        nmck: 800000,
        deadline: new Date('2024-07-25'),
        status: 'PROCESSING',
        etpUrl: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0123456789012345679'
      }
    ]
  })

  // Create some suppliers
  await prisma.supplier.createMany({
    data: [
      {
        name: 'ООО "Мебель-про"',
        inn: '1122334455',
        rating: 4.8,
        status: 'ACTIVE',
        contactPerson: 'Алексей Смирнов',
        phone: '+79123456789',
        email: 'smirnov@mebel.pro'
      },
      {
        name: 'ИП Веб-мастер',
        inn: '5544332211',
        rating: 4.5,
        status: 'VETTING',
        contactPerson: 'Ольга Кузнецова',
        phone: '+79123456788',
        email: 'kuznetsova@web.dev'
      }
    ]
  })

  // Create agents
  await prisma.agent.create({
    data: {
      name: 'Tender Scout',
      description: 'Анализирует описание закупки и находит похожие тендеры.',
      provider: 'GEMINI_2_5_FLASH',
      status: 'IDLE',
      systemPrompt: 'You are a tender analysis agent.',
      proxy: {
        create: {
          enabled: false
        }
      }
    }
  })

  await prisma.agent.create({
    data: {
      name: 'Price Optimizer',
      description: 'Рассчитывает оптимальную цену для участия в тендере.',
      provider: 'GEMINI_2_5_PRO',
      status: 'IDLE',
      systemPrompt: 'You are a price optimization agent.',
      proxy: {
        create: {
          enabled: true,
          host: 'proxy.example.com',
          port: 8080
        }
      }
    }
  })

  // Create client request
  const company = await prisma.company.findFirst({ where: { clientId: client.id } })
  if (company) {
    await prisma.clientRequest.create({
      data: {
        clientId: client.id,
        companyId: company.id,
        tenderDescription: 'Нужно найти и поучаствовать в тендере на поставку 10 офисных столов. Бюджет до 1.5 млн.',
        status: 'SUBMITTED',
        documents: {
          create: {
            name: 'Тех. задание.docx',
            url: '#'
          }
        }
      }
    })
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
