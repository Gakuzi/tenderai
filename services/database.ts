import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/auth'
import { UserRole, ClientStatus, SupplierStatus, AgentStatus, TenderStatus, RequestStatus, ApprovalStatus, WorkModelType, FinancialTransactionType, CommunicationChannelType, ConnectStatus, AgentModel } from '@prisma/client'

// Client operations
export const clientService = {
  async getAll() {
    return await prisma.client.findMany({
      include: {
        user: true,
        companies: {
          include: {
            platformCredentials: true,
            communicationChannels: true
          }
        },
        templates: true,
        transactions: true,
        workModel: true,
        integrations: true
      }
    })
  },

  async getById(id: string) {
    return await prisma.client.findUnique({
      where: { id },
      include: {
        user: true,
        companies: {
          include: {
            platformCredentials: true,
            communicationChannels: true
          }
        },
        templates: true,
        transactions: true,
        workModel: true,
        integrations: true,
        requests: {
          include: {
            documents: true,
            company: true
          }
        }
      }
    })
  },

  async create(data: {
    name: string
    contactPerson: string
    email: string
    password: string
  }) {
    const hashedPassword = await hashPassword(data.password)
    
    return await prisma.client.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        email: data.email,
        status: ClientStatus.LEAD,
        balance: 0,
        user: {
          create: {
            email: data.email,
            password: hashedPassword,
            role: UserRole.CLIENT
          }
        },
        integrations: {
          create: {
            telegramBotToken: null
          }
        },
        workModel: {
          create: {
            type: WorkModelType.RESULT_ORIENTED,
            baseCalculationFee: 5000,
            successBonusPercentage: 10
          }
        }
      },
      include: {
        user: true,
        workModel: true,
        integrations: true
      }
    })
  },

  async update(id: string, data: Partial<{
    name: string
    contactPerson: string
    status: ClientStatus
    balance: number
  }>) {
    return await prisma.client.update({
      where: { id },
      data,
      include: {
        user: true,
        companies: true,
        templates: true,
        transactions: true,
        workModel: true,
        integrations: true
      }
    })
  }
}

// Company operations
export const companyService = {
  async create(clientId: string, data: {
    name: string
    inn: string
    kpp: string
  }) {
    return await prisma.company.create({
      data: {
        ...data,
        clientId,
        isActive: true
      },
      include: {
        platformCredentials: true,
        communicationChannels: true
      }
    })
  },

  async update(id: string, data: Partial<{
    name: string
    inn: string
    kpp: string
    isActive: boolean
  }>) {
    return await prisma.company.update({
      where: { id },
      data,
      include: {
        platformCredentials: true,
        communicationChannels: true
      }
    })
  },

  async delete(id: string) {
    return await prisma.company.delete({
      where: { id }
    })
  }
}

// User operations
export const userService = {
  async getAll() {
    return await prisma.user.findMany({
      where: {
        role: { not: UserRole.CLIENT }
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    })
  },

  async create(data: {
    email: string
    password: string
    role: UserRole
  }) {
    const hashedPassword = await hashPassword(data.password)
    
    return await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    })
  }
}

// Tender operations
export const tenderService = {
  async getAll() {
    return await prisma.tender.findMany({
      include: {
        items: true,
        bids: true
      }
    })
  },

  async getById(id: string) {
    return await prisma.tender.findUnique({
      where: { id },
      include: {
        items: true,
        bids: true
      }
    })
  },

  async create(data: {
    title: string
    clientName: string
    nmck: number
    deadline: Date
    etpUrl: string
    items?: Array<{
      description: string
      quantity: number
      unit: string
    }>
  }) {
    return await prisma.tender.create({
      data: {
        title: data.title,
        clientName: data.clientName,
        nmck: data.nmck,
        deadline: data.deadline,
        etpUrl: data.etpUrl,
        status: TenderStatus.OPEN,
        items: data.items ? {
          create: data.items
        } : undefined
      },
      include: {
        items: true,
        bids: true
      }
    })
  }
}

// Supplier operations
export const supplierService = {
  async getAll() {
    return await prisma.supplier.findMany()
  },

  async getById(id: string) {
    return await prisma.supplier.findUnique({
      where: { id }
    })
  },

  async create(data: {
    name: string
    inn: string
    contactPerson: string
    phone: string
    email: string
  }) {
    return await prisma.supplier.create({
      data: {
        ...data,
        rating: 0,
        status: SupplierStatus.VETTING
      }
    })
  }
}

// Agent operations
export const agentService = {
  async getAll() {
    return await prisma.agent.findMany({
      include: {
        proxy: true
      }
    })
  },

  async getById(id: string) {
    return await prisma.agent.findUnique({
      where: { id },
      include: {
        proxy: true
      }
    })
  },

  async update(id: string, data: {
    name?: string
    description?: string
    provider?: AgentModel
    systemPrompt?: string
    proxy?: {
      enabled: boolean
      host?: string
      port?: number
    }
  }) {
    const { proxy, ...agentData } = data
    
    return await prisma.agent.update({
      where: { id },
      data: {
        ...agentData,
        proxy: proxy ? {
          upsert: {
            create: proxy,
            update: proxy
          }
        } : undefined
      },
      include: {
        proxy: true
      }
    })
  }
}

// Financial operations
export const financialService = {
  async createTransaction(clientId: string, data: {
    description: string
    amount: number
    type: FinancialTransactionType
  }) {
    return await prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.financialTransaction.create({
        data: {
          ...data,
          clientId
        }
      })

      // Update client balance
      const client = await tx.client.findUnique({
        where: { id: clientId }
      })

      if (client) {
        const balanceChange = data.type === FinancialTransactionType.CREDIT ? 
          data.amount : -data.amount
        
        await tx.client.update({
          where: { id: clientId },
          data: {
            balance: client.balance.toNumber() + balanceChange
          }
        })
      }

      return transaction
    })
  },

  async getAllTransactions() {
    return await prisma.financialTransaction.findMany({
      include: {
        client: {
          select: {
            name: true
          }
        }
      }
    })
  }
}

// Request operations
export const requestService = {
  async getAll(clientId?: string) {
    return await prisma.clientRequest.findMany({
      where: clientId ? { clientId } : undefined,
      include: {
        client: {
          select: {
            name: true
          }
        },
        company: {
          select: {
            name: true
          }
        },
        documents: true
      }
    })
  },

  async getById(id: string) {
    return await prisma.clientRequest.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            name: true
          }
        },
        company: {
          select: {
            name: true
          }
        },
        documents: true
      }
    })
  },

  async create(data: {
    clientId: string
    companyId?: string
    tenderDescription: string
  }) {
    return await prisma.clientRequest.create({
      data: {
        ...data,
        status: RequestStatus.DRAFT
      },
      include: {
        client: true,
        company: true,
        documents: true
      }
    })
  },

  async update(id: string, data: {
    status?: RequestStatus
    tenderDescription?: string
  }) {
    return await prisma.clientRequest.update({
      where: { id },
      data,
      include: {
        client: true,
        company: true,
        documents: true
      }
    })
  }
}
