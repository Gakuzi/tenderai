// Shared Enums
export enum TenderStatus {
  OPEN = 'OPEN',
  PROCESSING = 'PROCESSING',
  CLOSED = 'CLOSED',
  AWARDED = 'AWARDED',
  CANCELLED = 'CANCELLED'
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  LEAD = 'LEAD'
}

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  VETTING = 'VETTING'
}

export enum AgentStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  ACTIVE = 'ACTIVE',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum RequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

export enum WorkModelType {
  PACKAGE = 'PACKAGE',
  RESULT_ORIENTED = 'RESULT_ORIENTED'
}

export enum FinancialTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  REFUND = 'REFUND',
}

export enum FinancialDocumentType {
    ACT = 'ACT',
    CONTRACT = 'CONTRACT',
    RECONCILIATION = 'RECONCILIATION'
}

export enum CommunicationChannelType {
    EMAIL = 'EMAIL',
    TELEGRAM = 'TELEGRAM',
    WHATSAPP = 'WHATSAPP'
}

// Type Aliases
export type UserRole = 'Admin' | 'Manager' | 'Analyst' | 'Developer' | 'Client';
export type SystemRole = 'Admin' | 'Manager' | 'Analyst' | 'Developer';
export type AgentModel = 'Gemini 2.5 Flash' | 'Gemini 2.5 Pro' | 'ChatGPT-4' | 'YandexGPT' | 'GigaChat';

// Interfaces for Platform & Communication
export interface PlatformCredential {
    id: string;
    platformName: string;
    url: string;
    status: 'Connected' | 'Disconnected';
    sessionData: string; // JSON string
}

export interface CommunicationChannel {
    id: string;
    type: CommunicationChannelType;
    identifier: string;
    status: 'Connected' | 'Disconnected';
}

// Core Data Structures
export interface TenderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
}

export interface Tender {
  id: string;
  title: string;
  clientName: string;
  nmck: number;
  deadline: string;
  status: TenderStatus;
  etpUrl: string;
  items: TenderItem[];
}

export interface Company {
  id: string;
  name: string;
  inn: string;
  kpp: string;
  isActive: boolean;
  platformCredentials: PlatformCredential[];
  communicationChannels: CommunicationChannel[];
}

export interface ClientTemplate {
    id: string;
    name: string;
    type: string;
    fileUrl: string;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: FinancialTransactionType;
  clientName?: string; // Optional for transactions within a client object
}

export interface PackageConfig {
    packageName: string;
    tenderCount: number;
    price: number;
}

export interface ResultOrientedConfig {
    baseCalculationFee: number;
    successBonusPercentage: number;
}

export type WorkModel = {
    type: WorkModelType.PACKAGE;
    config: PackageConfig;
    tendersRemaining: number;
} | {
    type: WorkModelType.RESULT_ORIENTED;
    config: ResultOrientedConfig;
}

export interface Client {
  id: string;
  name: string;
  logoUrl: string;
  contactPerson: string;
  email: string;
  password?: string; // Should be omitted in most FE contexts
  status: ClientStatus;
  balance: number;
  companies: Company[];
  templates: ClientTemplate[];
  transactions: FinancialTransaction[];
  integrations: {
      telegramBotToken: string | null;
  };
  workModel: WorkModel;
}

export interface Supplier {
  id: string;
  name: string;
  inn: string;
  rating: number;
  status: SupplierStatus;
  contactPerson: string;
  phone: string;
  email: string;
}

export interface AgentProxy {
    enabled: boolean;
    host?: string;
    port?: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  provider: AgentModel;
  status: AgentStatus;
  systemPrompt: string;
  proxy: AgentProxy;
}

export interface Approval {
  id: string;
  action: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface ClientRequestDocument {
    name: string;
    url: string;
}

export interface ClientRequest {
  id: string;
  clientId: string;
  clientName: string;
  companyName: string;
  tenderDescription: string;
  receivedAt: string;
  status: RequestStatus;
  documents: ClientRequestDocument[];
}

export interface Bid {
    id: string;
    tenderId: string;
    supplierId: string;
    amount: number;
    submittedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  roles: SystemRole[];
}

export interface FinancialDocument {
    id: string;
    clientId: string;
    clientName: string;
    createdAt: string;
    type: FinancialDocumentType;
    status: 'GENERATED' | 'SENT';
    url: string;
}