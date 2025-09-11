import {
  Tender, TenderStatus, Client, ClientStatus, Supplier, SupplierStatus,
  Agent, AgentStatus, Approval, ApprovalStatus, AuditLog, ClientRequest, RequestStatus,
  Bid, Employee, UserRole, FinancialTransaction, FinancialDocument, WorkModelType, FinancialTransactionType, FinancialDocumentType, Company, CommunicationChannelType,
} from '../types';

// Mock Data
let MOCK_TENDERS: Tender[] = [
  { id: 't1', title: 'Поставка офисной мебели', clientName: 'ООО "Рога и копыта"', nmck: 1500000, deadline: '2024-08-01', status: TenderStatus.OPEN, etpUrl: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0123456789012345678', items: [{id: 'ti1', description: 'Стол офисный', quantity: 10, unit: 'шт.'}] },
  { id: 't2', title: 'Разработка веб-сайта', clientName: 'ИП Иванов', nmck: 800000, deadline: '2024-07-25', status: TenderStatus.PROCESSING, etpUrl: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0123456789012345678', items: [] },
  { id: 't3', title: 'Клининговые услуги', clientName: 'АО "Чистый офис"', nmck: 350000, deadline: '2024-07-20', status: TenderStatus.CLOSED, etpUrl: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0123456789012345678', items: [] },
];

let MOCK_CLIENTS: Client[] = [
  {
    id: 'c1', name: 'ООО "Рога и копыта"', logoUrl: 'https://placehold.co/100x100/A855F7/FFFFFF/png?text=РиК', contactPerson: 'Иван Петров', email: 'client@tendera.ai', password: 'password', status: ClientStatus.ACTIVE, balance: 150000,
    companies: [{ 
        id: 'comp1', 
        name: 'Основное ЮЛ', 
        inn: '1234567890', 
        kpp: '123456789', 
        isActive: true,
        platformCredentials: [{id: 'pc1', platformName: 'zakupki.gov.ru', url: 'https://zakupki.gov.ru', status: 'Connected', sessionData: '{"token": "dummy-token"}'}],
        communicationChannels: [
// FIX: Use CommunicationChannelType enum instead of string literal.
            { id: 'chan1', type: CommunicationChannelType.EMAIL, identifier: 'zakupki@roga-kopyta.ru', status: 'Connected' },
// FIX: Use CommunicationChannelType enum instead of string literal.
            { id: 'chan2', type: CommunicationChannelType.TELEGRAM, identifier: '+79991234567', status: 'Connected' },
        ]
    }],
    templates: [{ id: 'temp1', name: 'Стандартный договор', type: 'Договор', fileUrl: '#' }],
    transactions: [{ id: 'tx1', date: new Date().toISOString(), description: 'Пополнение баланса', amount: 200000, type: FinancialTransactionType.CREDIT }, { id: 'tx2', date: new Date().toISOString(), description: 'Оплата участия', amount: 50000, type: FinancialTransactionType.DEBIT }],
    integrations: { telegramBotToken: null },
    workModel: { type: WorkModelType.PACKAGE, config: { packageName: 'Стандарт', tenderCount: 10, price: 50000 }, tendersRemaining: 8 }
  },
  {
    id: 'c2', name: 'ИП Иванов', logoUrl: 'https://placehold.co/100x100/84CC16/FFFFFF/png?text=ИИ', contactPerson: 'Сергей Иванов', email: 'ivanov@example.com', status: ClientStatus.INACTIVE, balance: 0,
    companies: [], templates: [], transactions: [], integrations: { telegramBotToken: null },
    workModel: { type: WorkModelType.RESULT_ORIENTED, config: { baseCalculationFee: 5000, successBonusPercentage: 10 } }
  },
  {
    id: 'c3', name: 'АО "ТехноСтрой"', logoUrl: 'https://placehold.co/100x100/3B82F6/FFFFFF/png?text=ТС', contactPerson: 'Анна Сидорова', email: 'sidorova@techno.com', status: ClientStatus.LEAD, balance: 10000,
    companies: [], templates: [], transactions: [], integrations: { telegramBotToken: null },
    workModel: { type: WorkModelType.PACKAGE, config: { packageName: 'Пробный', tenderCount: 1, price: 10000 }, tendersRemaining: 1 }
  },
];

let MOCK_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'ООО "Мебель-про"', inn: '1122334455', rating: 4.8, status: SupplierStatus.ACTIVE, contactPerson: 'Алексей Смирнов', phone: '+79123456789', email: 'smirnov@mebel.pro' },
  { id: 's2', name: 'ИП Веб-мастер', inn: '5544332211', rating: 4.5, status: SupplierStatus.VETTING, contactPerson: 'Ольга Кузнецова', phone: '+79123456788', email: 'kuznetsova@web.dev' },
];

let MOCK_AGENTS: Agent[] = [
  { id: 'ag1', name: 'Tender Scout', description: 'Анализирует описание закупки и находит похожие тендеры.', provider: 'Gemini 2.5 Flash', status: AgentStatus.IDLE, systemPrompt: 'You are a tender analysis agent.', proxy: { enabled: false } },
  { id: 'ag2', name: 'Supplier Scout', description: 'Находит и проверяет поставщиков по заданным критериям.', provider: 'Gemini 2.5 Flash', status: AgentStatus.IDLE, systemPrompt: 'You are a supplier scouting agent.', proxy: { enabled: false } },
  { id: 'ag3', name: 'Price Optimizer', description: 'Рассчитывает оптимальную цену для участия в тендере.', provider: 'Gemini 2.5 Pro', status: AgentStatus.IDLE, systemPrompt: 'You are a price optimization agent.', proxy: { enabled: true, host: 'proxy.example.com', port: 8080 } },
  { id: 'ag4', name: 'Doc Generator', description: 'Генерирует Форму 2 и другие документы для заявки.', provider: 'YandexGPT', status: AgentStatus.IDLE, systemPrompt: 'You are a document generation agent.', proxy: { enabled: false } },
];

let MOCK_APPROVALS: Approval[] = [
  { id: 'ap1', action: 'Подать заявку на тендер "Поставка офисной мебели"', requestedBy: 'Аналитик Смирнов', requestedAt: '2024-07-21T10:00:00Z', status: ApprovalStatus.PENDING },
  { id: 'ap2', action: 'Снизить цену на 5% для ИП Иванов', requestedBy: 'Менеджер Петров', requestedAt: '2024-07-20T15:30:00Z', status: ApprovalStatus.APPROVED },
];

let MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'au1', timestamp: new Date().toISOString(), user: 'admin@tendera.ai', action: 'Login', details: 'User logged in successfully' },
  { id: 'au2', timestamp: new Date().toISOString(), user: 'Agent "Tender Scout"', action: 'Run', details: 'Agent started for request #cr1' },
];

let MOCK_CLIENT_REQUESTS: ClientRequest[] = [
  { id: 'cr1', clientId: 'c1', clientName: 'ООО "Рога и копыта"', companyName: 'Основное ЮЛ', tenderDescription: 'Нужно найти и поучаствовать в тендере на поставку 10 офисных столов. Бюджет до 1.5 млн.', receivedAt: '2024-07-20T14:00:00Z', status: RequestStatus.SUBMITTED, documents: [{name: 'Тех. задание.docx', url: '#'}] },
  { id: 'cr2', clientId: 'c2', clientName: 'ИП Иванов', companyName: 'ИП Иванов', tenderDescription: 'Требуется разработка корпоративного сайта-визитки. Срок - 1 месяц.', receivedAt: '2024-07-19T11:00:00Z', status: RequestStatus.IN_PROGRESS, documents: [] },
  { id: 'cr3', clientId: 'c1', clientName: 'ООО "Рога и копыта"', companyName: 'Основное ЮЛ', tenderDescription: 'Ежемесячная уборка офиса 200 кв.м.', receivedAt: '2024-06-15T09:00:00Z', status: RequestStatus.COMPLETED, documents: [] },
];

let MOCK_BIDS: Bid[] = [];
let MOCK_EMPLOYEES: Employee[] = [
    { id: 'e1', name: 'Иван Админов', email: 'admin@tendera.ai', roles: ['Admin', 'Developer'] },
    { id: 'e2', name: 'Мария Менеджерова', email: 'manager@tendera.ai', roles: ['Manager'] },
    { id: 'e3', name: 'Алексей Аналитиков', email: 'analyst@tendera.ai', roles: ['Analyst'] },
];
let MOCK_TRANSACTIONS: FinancialTransaction[] = [
    { id: 'ft1', clientName: 'ООО "Рога и копыта"', date: '2024-07-21', description: 'Пополнение баланса', amount: 50000, type: FinancialTransactionType.CREDIT },
    { id: 'ft2', clientName: 'ИП Иванов', date: '2024-07-20', description: 'Оплата услуг', amount: 15000, type: FinancialTransactionType.DEBIT },
];
let MOCK_DOCUMENTS: FinancialDocument[] = [
    { id: 'fd1', clientId: 'c1', clientName: 'ООО "Рога и копыта"', createdAt: '2024-07-01', type: FinancialDocumentType.ACT, status: 'GENERATED', url: '#' },
];


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const api = {
  fetchTenders: async (): Promise<Tender[]> => (await delay(500), MOCK_TENDERS),
  fetchTenderById: async (id: string): Promise<Tender | undefined> => (await delay(500), MOCK_TENDERS.find(t => t.id === id)),
  fetchClients: async (): Promise<Client[]> => (await delay(500), MOCK_CLIENTS),
  fetchClientById: async (id: string): Promise<Client | undefined> => (await delay(500), MOCK_CLIENTS.find(c => c.id === id)),
  createClient: async (clientData: Omit<Client, 'id' | 'logoUrl' | 'status' | 'balance' | 'companies' | 'templates' | 'transactions' | 'integrations' | 'workModel'>): Promise<Client> => {
    await delay(1000);
    const newClient: Client = {
      id: `c${Date.now()}`,
      name: clientData.name,
      contactPerson: clientData.contactPerson,
      email: clientData.email,
      password: clientData.password,
      logoUrl: `https://placehold.co/100x100/7C3AED/FFFFFF/png?text=${clientData.name.substring(0,2)}`,
      status: ClientStatus.LEAD,
      balance: 0,
      companies: [],
      templates: [],
      transactions: [],
      integrations: { telegramBotToken: null },
      workModel: { type: WorkModelType.RESULT_ORIENTED, config: { baseCalculationFee: 5000, successBonusPercentage: 10 } }
    };
    MOCK_CLIENTS.push(newClient);
    return newClient;
  },
  updateClient: async (clientData: Client): Promise<Client> => {
      await delay(500);
      MOCK_CLIENTS = MOCK_CLIENTS.map(c => c.id === clientData.id ? clientData : c);
      return clientData;
  },
  fetchSuppliers: async (): Promise<Supplier[]> => (await delay(500), MOCK_SUPPLIERS),
  fetchSupplierById: async (id: string): Promise<Supplier | undefined> => (await delay(500), MOCK_SUPPLIERS.find(s => s.id === id)),
  fetchAgents: async (): Promise<Agent[]> => (await delay(500), MOCK_AGENTS),
  fetchAgentById: async (id: string): Promise<Agent | undefined> => (await delay(500), MOCK_AGENTS.find(a => a.id === id)),
  updateAgent: async (agentData: Agent): Promise<Agent> => {
      await delay(500);
      MOCK_AGENTS = MOCK_AGENTS.map(a => a.id === agentData.id ? agentData : a);
      return agentData;
  },
  invokeAgent: async (agentId: string, params: any): Promise<any> => {
    console.log(`Invoking agent ${agentId} with params:`, params);
    await delay(2000);
    return { success: true, message: `Agent ${agentId} executed.` };
  },
  fetchApprovals: async (): Promise<Approval[]> => (await delay(500), MOCK_APPROVALS),
  fetchAuditLogs: async (): Promise<AuditLog[]> => (await delay(500), MOCK_AUDIT_LOGS),
  fetchClientRequests: async (clientId?: string): Promise<ClientRequest[]> => (
    await delay(500),
    clientId ? MOCK_CLIENT_REQUESTS.filter(r => r.clientId === clientId) : MOCK_CLIENT_REQUESTS
  ),
  fetchClientRequestById: async (id: string): Promise<ClientRequest | undefined> => (await delay(500), MOCK_CLIENT_REQUESTS.find(r => r.id === id)),
  fetchBidsForTender: async (tenderId: string): Promise<Bid[]> => (await delay(500), MOCK_BIDS.filter(b => b.id === tenderId)), // This logic is wrong, but it's mock
  fetchEmployees: async (): Promise<Employee[]> => (await delay(500), MOCK_EMPLOYEES),
  createEmployee: async (employeeData: Omit<Employee, 'id'>): Promise<Employee> => {
    await delay(500);
    const newEmployee = { ...employeeData, id: `e${Date.now()}`};
    MOCK_EMPLOYEES.push(newEmployee);
    return newEmployee;
  },
  fetchAllTransactions: async (): Promise<FinancialTransaction[]> => (await delay(500), MOCK_TRANSACTIONS),
  fetchFinancialDocuments: async (): Promise<FinancialDocument[]> => (await delay(500), MOCK_DOCUMENTS),
  createFinancialTransaction: async (clientId: string, data: Omit<FinancialTransaction, 'id' | 'date' | 'clientName'>): Promise<FinancialTransaction> => {
      await delay(500);
      const client = MOCK_CLIENTS.find(c => c.id === clientId);
      if (!client) throw new Error("Client not found");
      const newTx: FinancialTransaction = { ...data, id: `ft${Date.now()}`, date: new Date().toISOString(), clientName: client.name };
      MOCK_TRANSACTIONS.unshift(newTx);
      // Update client balance
      const amount = data.type === 'CREDIT' ? data.amount : -data.amount;
      client.balance += amount;
      client.transactions.unshift({...newTx});
      return newTx;
  },
  createFinancialDocument: async (data: Omit<FinancialDocument, 'id' | 'createdAt' | 'status' | 'url'>): Promise<FinancialDocument> => {
      await delay(1000);
      const newDoc: FinancialDocument = { ...data, id: `fd${Date.now()}`, createdAt: new Date().toISOString(), status: 'GENERATED', url: '#' };
      MOCK_DOCUMENTS.unshift(newDoc);
      return newDoc;
  },
  // Company management
  createCompany: async(clientId: string, companyData: Omit<Company, 'id'>): Promise<Company> => {
    await delay(1000);
    const client = MOCK_CLIENTS.find(c => c.id === clientId);
    if (!client) throw new Error("Client not found");
    const newCompany: Company = { ...companyData, id: `comp${Date.now()}`};
    client.companies.push(newCompany);
    return newCompany;
  },
  updateCompany: async(clientId: string, companyData: Company): Promise<Company> => {
    await delay(1000);
    const client = MOCK_CLIENTS.find(c => c.id === clientId);
    if (!client) throw new Error("Client not found");
    client.companies = client.companies.map(c => c.id === companyData.id ? companyData : c);
    return companyData;
  },
  deleteCompany: async(clientId: string, companyId: string): Promise<void> => {
    await delay(1000);
    const client = MOCK_CLIENTS.find(c => c.id === clientId);
    if (!client) throw new Error("Client not found");
    client.companies = client.companies.filter(c => c.id !== companyId);
    return;
  },
};