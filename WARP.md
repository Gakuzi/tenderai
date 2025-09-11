# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

TenderAI is a React-based procurement management system that automates tender participation using AI agents. The application manages clients, suppliers, tenders, and AI agents for document generation and tender analysis.

## Common Development Commands

### Start Development Server
```bash
npm run dev
```
Starts the Vite development server on `http://localhost:5173`

### Build for Production
```bash
npm run build
```
Creates production build in `dist/` directory

### Preview Production Build
```bash
npm run preview
```
Serves the production build locally for testing

### Install Dependencies
```bash
npm install
```

### Environment Setup
The application requires a Gemini API key:
1. Create `.env.local` file in the root directory
2. Add `GEMINI_API_KEY=your_api_key_here`

## Architecture Overview

### Core Structure
- **Frontend**: React 19 with TypeScript, using Vite as build tool
- **Routing**: React Router DOM with HashRouter for client-side routing
- **State Management**: React Context API for auth and localization
- **Styling**: Tailwind CSS implied (dark mode support)
- **Icons**: Lucide React

### Key Architectural Patterns

#### Role-Based Access Control
The application implements comprehensive role-based routing and UI:
- **System Roles**: Admin, Manager, Analyst, Developer
- **Client Role**: Separate interface and workflow
- **Impersonation**: Staff can view client interfaces
- Roles are defined in `types.ts` and constants determine navigation permissions

#### Multi-Tenant Client Architecture
- Clients can have multiple companies/legal entities
- Each company has platform credentials and communication channels
- Work models: Package-based or result-oriented pricing
- Financial tracking per client with transaction history

#### AI Agent Integration
- Modular AI agents with different providers (Gemini, ChatGPT, YandexGPT, GigaChat)
- Agent configuration includes system prompts and proxy settings
- Mock service layer demonstrates integration patterns for future backend

#### Internationalization (i18n)
- Context-based localization system supporting Russian and English
- Comprehensive translations for all UI elements
- Language switching preserves user session

### Directory Structure

```
├── components/          # Reusable UI components
│   ├── client/         # Client-specific components
│   └── Layout.tsx      # Main layout wrapper
├── contexts/           # React Context providers
│   ├── AuthContext.tsx # Authentication & role management
│   └── LocalizationContext.tsx # i18n support
├── hooks/              # Custom React hooks
├── pages/              # Route components
│   └── client/         # Client portal pages
├── services/           # API layer and external services
│   ├── api.ts          # Mock API with full data structure
│   └── geminiService.ts # AI service integration
├── types.ts            # TypeScript type definitions
└── constants.ts        # Navigation and platform definitions
```

### Data Model Highlights

#### Core Entities
- **Tender**: Procurement opportunities with status tracking
- **Client**: Multi-company entities with financial models
- **Agent**: Configurable AI assistants for various tasks
- **Supplier**: Vendor management with ratings and status
- **Approval**: Workflow management system

#### Status Enums
All entities use comprehensive status enums for state management:
- `TenderStatus`, `ClientStatus`, `AgentStatus`, `RequestStatus`, `ApprovalStatus`

#### Platform Integration
- Russian procurement platforms (zakupki.gov.ru, Sberbank-AST, etc.)
- Credential management per company
- Communication channels (Email, Telegram, WhatsApp)

### Authentication Flow
1. Login checks staff users first, then client users
2. Role determines available routes and sidebar links
3. Staff can impersonate clients while maintaining their permissions
4. Client users have completely separate UI and workflow

### Mock Data Strategy
The `services/api.ts` contains comprehensive mock data that demonstrates:
- Complex relational data structures
- Realistic Russian procurement scenarios  
- Financial transaction patterns
- Multi-company client setups

## Development Notes

### Component Architecture
- Functional components with hooks
- Context for cross-cutting concerns (auth, i18n)
- Clear separation between admin and client interfaces
- Layout components handle role-specific navigation

### Type Safety
- Comprehensive TypeScript definitions in `types.ts`
- Enum-based status management
- Union types for role-based permissions
- Interface inheritance for related entities

### AI Service Integration
The `geminiService.ts` shows integration patterns for:
- Text generation with prompts
- Structured JSON responses with schemas
- Error handling and fallback behavior
- Environment variable usage for API keys

### Future Backend Integration
The mock API in `services/api.ts` provides a complete contract for backend implementation, including:
- CRUD operations for all entities
- Complex filtering and relationships
- Financial transaction handling
- File upload patterns for documents

## База данных

### Архитектура
- **Локальная разработка**: SQLite (`dev.db`)
- **Продакшен**: PostgreSQL на Neon (бесплатно)
- **ORM**: Prisma для типобезопасной работы с БД

### Команды для работы с БД
```bash
npm run db:migrate    # Применить миграции
npm run db:seed      # Заполнить тестовыми данными  
npm run db:studio    # Открыть Prisma Studio (http://localhost:5555)
npm run db:generate  # Сгенерировать Prisma Client
```

### Схема базы данных

#### Основные таблицы:
- **users** - Пользователи системы (staff + клиенты)
- **clients** - Клиенты с профилями и настройками
- **companies** - Компании клиентов (мультитенантность)
- **platform_credentials** - Учетные данные для площадок закупок
- **communication_channels** - Каналы связи (Email, Telegram, WhatsApp)
- **client_integrations** - Интеграции с мессенджерами
- **work_models** - Модели работы (пакетная/по результату)
- **tenders** - Тендеры и закупки
- **client_requests** - Заявки клиентов
- **agents** - AI агенты с настройками
- **suppliers** - Поставщики
- **financial_transactions** - Финансовые операции

### Аутентификация
- JWT токены с хэшированием паролей (bcrypt)
- Роли: ADMIN, MANAGER, ANALYST, DEVELOPER, CLIENT
- Разделение интерфейсов по ролям

### Готовые тестовые данные
После `npm run db:seed`:
- admin@tendera.ai / password (Admin)
- manager@tendera.ai / password (Manager)  
- analyst@tendera.ai / password (Analyst)
- client@tendera.ai / password (Client)

### Деплой
Подробные инструкции в файле `DEPLOY.md` для развертывания на Vercel + Neon PostgreSQL (бесплатно).
