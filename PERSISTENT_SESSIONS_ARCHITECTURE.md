# Архитектура Долгоживущих Сессий для TenderAI

## Обзор Решений

На основе исследования популярных решений для автоматизации WhatsApp выявлены следующие ключевые паттерны:

### 1. Основные Библиотеки
- **whatsapp-web.js** (19.4k ⭐) - главная Node.js библиотека для WhatsApp Web
- **wppconnect/wa-js** (573 ⭐) - альтернативное решение с экспортом функций WhatsApp Web
- **chrishubert/whatsapp-api** (1.4k ⭐) - REST API обертка для whatsapp-web.js

### 2. Облачные Решения для Хранения Сессий
- **Firebase Storage** - wwebjs-firebase-storage (6 ⭐)
- **AWS S3** - wwebjs-aws-s3 (5 ⭐) 
- **Supabase** - wwebjs-supabase (1 ⭐)
- **Google Cloud Storage** - wwebjs-google-cloud-storage-store

## Рекомендуемая Архитектура

### 1. Основной Стек
```
┌─────────────────────┐
│   TenderAI API      │
├─────────────────────┤
│  Session Manager    │
├─────────────────────┤
│  whatsapp-web.js    │
├─────────────────────┤
│     Puppeteer       │
├─────────────────────┤
│  Headless Chrome    │
└─────────────────────┘
```

### 2. Облачное Хранение Сессий

#### Локальная Разработка
- Файловая система: `./sessions/{sessionId}/`
- SQLite для метаданных сессий

#### Облачное Развертывание
- **Primary**: Supabase Storage (совместимо с нашей PostgreSQL)
- **Alternative**: Firebase Storage или AWS S3
- **Backup**: Redis для кэширования состояний

### 3. Компоненты Системы

#### A. SessionManager Class
```typescript
class PersistentSessionManager {
  private activeSessions: Map<string, SessionInstance>
  private healthCheckInterval: NodeJS.Timer
  private reconnectQueue: Queue<string>
  
  // Основные методы
  async createSession(clientId: string): Promise<SessionInstance>
  async restoreSession(clientId: string): Promise<SessionInstance>
  async healthCheck(sessionId: string): Promise<SessionHealth>
  async reconnectSession(sessionId: string): Promise<void>
}
```

#### B. SessionInstance Class
```typescript
class SessionInstance {
  private puppeteerPage: Page
  private whatsappClient: Client
  private lastActivity: Date
  private isHealthy: boolean
  
  // Методы жизненного цикла
  async initialize(): Promise<void>
  async authenticate(): Promise<void>
  async saveSession(): Promise<void>
  async restoreSession(): Promise<void>
  async cleanup(): Promise<void>
  
  // Проверки здоровья
  async checkConnection(): Promise<boolean>
  async heartbeat(): Promise<void>
}
```

#### C. Cloud Storage Adapter
```typescript
interface CloudStorageAdapter {
  async saveSession(sessionId: string, data: SessionData): Promise<void>
  async loadSession(sessionId: string): Promise<SessionData>
  async deleteSession(sessionId: string): Promise<void>
  async listSessions(): Promise<string[]>
}

class SupabaseStorageAdapter implements CloudStorageAdapter {
  // Реализация для Supabase
}
```

## Ключевые Паттерны

### 1. Health Checks & Auto-Reconnect
```typescript
// Проверка каждые 30 секунд
setInterval(async () => {
  for (const [sessionId, session] of this.activeSessions) {
    const health = await session.checkConnection()
    if (!health.isConnected) {
      await this.reconnectQueue.add(sessionId)
    }
  }
}, 30000)
```

### 2. Session Persistence Strategy
```typescript
// Сохранение состояния каждые 5 минут или при изменении
class SessionPersistence {
  async autoSave(session: SessionInstance) {
    const saveInterval = setInterval(async () => {
      if (session.hasChanges()) {
        await session.saveSession()
      }
    }, 5 * 60 * 1000) // 5 минут
    
    return saveInterval
  }
}
```

### 3. Graceful Degradation
```typescript
// Очередь сообщений при потере соединения
class MessageQueue {
  private queue: Message[] = []
  
  async queueMessage(message: Message) {
    this.queue.push(message)
    await this.tryProcessQueue()
  }
  
  async tryProcessQueue() {
    while (this.queue.length > 0 && this.session.isHealthy) {
      const message = this.queue.shift()
      await this.session.sendMessage(message)
    }
  }
}
```

## Docker & Облачная Конфигурация

### 1. Dockerfile
```dockerfile
FROM node:18-alpine

# Установка Chrome для Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Настройки для production
ENV NODE_ENV=production
ENV SESSION_STORAGE=supabase
ENV HEALTH_CHECK_INTERVAL=30000
ENV AUTO_RECONNECT=true

WORKDIR /app
COPY . .
RUN npm ci --only=production

CMD ["npm", "start"]
```

### 2. Environment Variables
```env
# Session Management
SESSION_STORAGE_TYPE=supabase
SESSION_ENCRYPTION_KEY=your-encryption-key
SESSION_TTL=7776000  # 90 days

# Cloud Storage
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_STORAGE_BUCKET=whatsapp-sessions

# Health Monitoring
HEALTH_CHECK_INTERVAL=30000
MAX_RECONNECT_ATTEMPTS=3
RECONNECT_BACKOFF_MS=5000

# Puppeteer Config
PUPPETEER_HEADLESS=true
PUPPETEER_NO_SANDBOX=true
PUPPETEER_USER_DATA_DIR=/app/sessions
```

### 3. Vercel/Railway/Render Configuration
```json
{
  "name": "tenderai-sessions",
  "memory": 1024,
  "env": {
    "NODE_ENV": "production",
    "SESSION_STORAGE_TYPE": "supabase"
  },
  "buildCommand": "npm run build",
  "startCommand": "npm run start:sessions"
}
```

## Мониторинг & Логирование

### 1. Dashboard Endpoints
```typescript
// GET /api/sessions/status
{
  "total": 5,
  "active": 4,
  "reconnecting": 1,
  "failed": 0,
  "sessions": [
    {
      "id": "client-123",
      "status": "connected",
      "lastActivity": "2025-01-11T21:00:00Z",
      "messagesProcessed": 142,
      "uptime": 86400
    }
  ]
}

// POST /api/sessions/restart/:sessionId
// DELETE /api/sessions/:sessionId
```

### 2. Logging Strategy
```typescript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'session-manager' },
  transports: [
    new winston.transports.File({ filename: 'sessions.log' }),
    new winston.transports.Console()
  ]
})

// Специфичные логи
logger.info('Session created', { sessionId, clientId })
logger.warn('Session health check failed', { sessionId, error })
logger.error('Session reconnection failed', { sessionId, attempt })
```

## Масштабирование

### 1. Horizontal Scaling
- Один процесс = 1-5 активных сессий
- Load balancer для распределения клиентов
- Shared storage для состояния сессий

### 2. Vertical Scaling
- RAM: 512MB на сессию (Chrome + session data)
- CPU: 0.5 core на сессию при активной работе
- Storage: ~50MB на сессию

### 3. Cost Optimization
- Автоматическое закрытие неактивных сессий (> 24 часа)
- Компрессия session data перед сохранением
- Кэширование часто используемых данных

## План Внедрения

### Phase 1: Базовая Реализация
1. ✅ Создание SessionManager с файловым хранением
2. ⭕ Реализация health checks
3. ⭕ Добавление auto-reconnect логики

### Phase 2: Cloud Integration  
1. ⭕ Интеграция с Supabase Storage
2. ⭕ Добавление шифрования сессий
3. ⭕ Создание мониторинг dashboard

### Phase 3: Production Ready
1. ⭕ Docker контейнеризация
2. ⭕ CI/CD пайплайн
3. ⭕ Load testing и оптимизация

### Phase 4: Advanced Features
1. ⭕ Multi-region deployment
2. ⭕ Advanced analytics
3. ⭕ Auto-scaling based on load
