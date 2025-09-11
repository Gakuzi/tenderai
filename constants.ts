import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  DollarSign,
  Cpu,
  CheckSquare,
  History,
  Settings,
  User,
  PlusCircle,
  FileStack,
  Building,
} from 'lucide-react';

export const ADMIN_SIDEBAR_LINKS = [
  { href: '/dashboard', label: 'dashboard', icon: LayoutDashboard },
  { href: '/tenders', label: 'tenders', icon: FileText },
  { href: '/requests', label: 'client_requests', icon: FileStack },
  { href: '/clients', label: 'clients', icon: User },
  { href: '/suppliers', label: 'suppliers', icon: Briefcase },
  { href: '/finances', label: 'finances', icon: DollarSign },
  { href: '/agents', label: 'agents', icon: Cpu },
  { href: '/users', label: 'employees', icon: Users },
  { href: '/approvals', label: 'approvals', icon: CheckSquare },
  { href: '/audit', label: 'audit_log', icon: History },
  { href: '/settings', label: 'settings', icon: Settings },
];

export const MANAGER_SIDEBAR_LINKS = [
  { href: '/dashboard', label: 'dashboard', icon: LayoutDashboard },
  { href: '/requests', label: 'client_requests', icon: FileStack },
  { href: '/clients', label: 'clients', icon: User },
  { href: '/finances', label: 'finances', icon: DollarSign },
  { href: '/settings', label: 'settings', icon: Settings },
];

export const ANALYST_SIDEBAR_LINKS = [
  { href: '/dashboard', label: 'dashboard', icon: LayoutDashboard },
  { href: '/tenders', label: 'tenders', icon: FileText },
  { href: '/suppliers', label: 'suppliers', icon: Briefcase },
  { href: '/agents', label: 'agents', icon: Cpu },
  { href: '/approvals', label: 'approvals', icon: CheckSquare },
  { href: '/settings', label: 'settings', icon: Settings },
];


export const CLIENT_SIDEBAR_LINKS = [
    { href: '/client/dashboard', label: 'client_dashboard', icon: LayoutDashboard },
    { href: '/client/my-companies', label: 'my_companies', icon: Building },
    { href: '/client/requests', label: 'my_requests', icon: FileStack },
    { href: '/client/finances', label: 'client_finances', icon: DollarSign },
    { href: '/client/new-request', label: 'new_request', icon: PlusCircle },
    { href: '/settings', label: 'settings', icon: Settings },
];

export const RUSSIAN_TENDER_PLATFORMS = [
    { id: 'zakupki', name: 'ЕИС Закупки (zakupki.gov.ru)', loginUrl: 'https://zakupki.gov.ru/epz/main/public/home.html' },
    { id: 'sberbank-ast', name: 'Сбербанк-АСТ', loginUrl: 'https://www.sberbank-ast.ru/' },
    { id: 'roseltorg', name: 'Росэлторг', loginUrl: 'https://www.roseltorg.ru/logon' },
    { id: 'etp-gpb', name: 'ЭТП ГПБ', loginUrl: 'https://etp.gpb.ru/' },
    { id: 'tektorg', name: 'ТЭК-Торг', loginUrl: 'https://www.tektorg.ru/login' },
    { id: 'b2b-center', name: 'B2B-Center', loginUrl: 'https://www.b2b-center.ru/personal/login/' },
    { id: 'etp-rf', name: 'РТС-тендер', loginUrl: 'https://www.rts-tender.ru/' },
    { id: 'fabrikant', name: 'Фабрикант', loginUrl: 'https://www.fabrikant.ru/personal/login/' },
];