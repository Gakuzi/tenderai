# 🚀 Инструкция по развертыванию TenderAI

Полное руководство по развертыванию React приложения TenderAI с интеграцией мессенджеров в продакшн.

## 📋 Оглавление

- [Подготовка проекта](#подготовка-проекта)
- [База данных](#база-данных)
- [Фронтенд (Vercel)](#фронтенд-vercel)
- [Бэкенд API (Railway)](#бэкенд-api-railway)
- [Мессенджеры](#мессенджеры)
- [Домен и SSL](#домен-и-ssl)
- [CI/CD](#ci-cd)
- [Мониторинг](#мониторинг)

## 🔧 Подготовка проекта

### 1. Клонирование репозитория
```bash
git clone https://github.com/your-username/tenderai.git
cd tenderai
npm install
```

### 2. Переменные окружения
Создайте файлы окружения для разных сред:

**.env.local** (для локальной разработки):
```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-local-jwt-secret-key-32-chars-min"
GEMINI_API_KEY="your_gemini_api_key"
TELEGRAM_API_ID="your_telegram_api_id"
TELEGRAM_API_HASH="your_telegram_api_hash"
NODE_ENV="development"
```

**.env.production** (для продакшена):
```bash
DATABASE_URL="postgresql://username:password@host:port/database"
JWT_SECRET="super-secure-production-jwt-secret-key"
GEMINI_API_KEY="production_gemini_api_key"
TELEGRAM_API_ID="telegram_api_id"
TELEGRAM_API_HASH="telegram_api_hash"
NODE_ENV="production"
```

### 3. Сборка для продакшена
```bash
npm run build
npm run db:generate
```

## 🗄️ База данных

### Вариант 1: Neon (рекомендуется для продакшена)

1. **Создание аккаунта**
   - Зайдите на [neon.tech](https://neon.tech)
   - Создайте бесплатный аккаунт
   - Создайте новый проект

2. **Настройка базы данных**
   ```bash
   # Получите строку подключения из Neon Dashboard
   # Формат: postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname
   ```

3. **Применение миграций**
   ```bash
   # Обновите DATABASE_URL в .env
   DATABASE_URL="postgresql://your-connection-string"
   
   # Примените миграции
   npx prisma migrate deploy
   npx prisma generate
   npx prisma db seed
   ```

### Вариант 2: Supabase
1. Создайте проект на [supabase.com](https://supabase.com)
2. Получите PostgreSQL connection string
3. Примените миграции аналогично Neon

### Вариант 3: Vercel Postgres
```bash
# Установите Vercel CLI
npm i -g vercel

# Добавьте Postgres к проекту
vercel postgres create
```

## 🌐 Фронтенд (Vercel)

### 1. Подготовка проекта
```bash
# Убедитесь что build работает
npm run build
```

### 2. Деплой на Vercel

**Через CLI:**
```bash
npm i -g vercel
vercel login
vercel --prod
```

**Через GitHub Integration:**
1. Зайдите на [vercel.com](https://vercel.com)
2. Import Git Repository
3. Выберите ваш GitHub репозиторий
4. Настройте переменные окружения

### 3. Настройка переменных среды в Vercel
В Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL = postgresql://your-neon-connection
JWT_SECRET = your-production-jwt-secret
GEMINI_API_KEY = your-production-key
TELEGRAM_API_ID = your-telegram-id
TELEGRAM_API_HASH = your-telegram-hash
NODE_ENV = production
```

### 4. Build & Output Settings
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Root Directory:** `./`

## 🔧 Бэкенд API (Railway)

### 1. Подготовка API сервера
Создайте файл **`server.js`**:
```javascript
const express = require('express');
const cors = require('cors');
const whatsappRoutes = require('./api/whatsapp.cjs');
const telegramRoutes = require('./api/telegram.cjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/telegram', telegramRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
```

### 2. Деплой на Railway
```bash
# Установите Railway CLI
npm install -g @railway/cli

# Логин
railway login

# Создайте проект
railway new

# Деплой
railway up
```

### 3. Переменные среды в Railway
```
DATABASE_URL=postgresql://your-neon-connection
JWT_SECRET=your-jwt-secret
TELEGRAM_API_ID=your-telegram-id
TELEGRAM_API_HASH=your-telegram-hash
```

### Альтернативы Railway:
- **Render:** [render.com](https://render.com) - бесплатный план
- **Fly.io:** [fly.io](https://fly.io) - бесплатный план  
- **Heroku:** [heroku.com](https://heroku.com) - платно

## 📱 Мессенджеры

### WhatsApp
1. Сервер будет запускаться автоматически на Railway
2. Веб-интерфейс доступен по адресу: `https://your-app.railway.app`
3. QR-авторизация через веб-интерфейс

### Telegram
1. **Получение API ключей:**
   - Зайдите на [my.telegram.org](https://my.telegram.org)
   - API development tools
   - Создайте приложение
   - Получите `api_id` и `api_hash`

2. **Настройка:**
   - Добавьте ключи в переменные окружения
   - Telegram сервер: `https://your-app.railway.app:3003`

## 🌍 Домен и SSL

### 1. Настройка кастомного домена в Vercel
```bash
# В Vercel Dashboard → Domains
# Добавьте ваш домен: tenderai.yourdomain.com
```

### 2. DNS настройки
Добавьте CNAME записи у вашего DNS провайдера:
```
CNAME tenderai 76.76.19.19 (Vercel IP)
```

### 3. SSL
SSL сертификаты настраиваются автоматически в Vercel.

## ⚙️ CI/CD

### GitHub Actions
Создайте файл **`.github/workflows/deploy.yml`**:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      - run: npm test

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      # Деплой на Vercel
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      
      # Деплой на Railway
      - uses: railway-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

### Настройка секретов в GitHub
Settings → Secrets and variables → Actions:
```
VERCEL_TOKEN = your-vercel-token
ORG_ID = your-vercel-org-id  
PROJECT_ID = your-vercel-project-id
RAILWAY_TOKEN = your-railway-token
```

## 📊 Мониторинг

### 1. Логирование
```javascript
// Добавьте в server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 2. Мониторинг ошибок
- **Sentry:** [sentry.io](https://sentry.io) - мониторинг ошибок
- **LogRocket:** [logrocket.com](https://logrocket.com) - session replay

### 3. Аналитика
- **Vercel Analytics** - встроенная аналитика
- **Google Analytics** - веб-аналитика

## 🔒 Безопасность

### 1. Переменные окружения
- ✅ Никогда не коммитьте `.env` файлы
- ✅ Используйте разные ключи для разработки и продакшена
- ✅ Ротация ключей каждые 90 дней

### 2. CORS
```javascript
app.use(cors({
  origin: ['https://tenderai.yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
```

### 3. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов за 15 минут
});

app.use(limiter);
```

## ✅ Проверочный чеклист

### Перед деплоем:
- [ ] Все тесты проходят
- [ ] Build собирается без ошибок
- [ ] База данных настроена
- [ ] Переменные окружения настроены
- [ ] API ключи получены и настроены

### После деплоя:
- [ ] Фронтенд доступен
- [ ] API отвечает на запросы
- [ ] База данных подключена
- [ ] WhatsApp интеграция работает
- [ ] Telegram интеграция работает
- [ ] SSL сертификат активен
- [ ] Мониторинг настроен

## 🆘 Решение проблем

### Частые ошибки:

1. **Build fails on Vercel**
   ```bash
   # Проверьте зависимости
   npm install
   npm run build
   ```

2. **Database connection fails**
   ```bash
   # Проверьте DATABASE_URL
   npx prisma migrate deploy
   ```

3. **API not responding**
   ```bash
   # Проверьте Railway логи
   railway logs
   ```

4. **Telegram API errors**
   - Проверьте правильность API_ID и API_HASH
   - Убедитесь что IP адрес разрешен в Telegram App

## 📞 Поддержка

- **Документация:** [ссылка на документацию]
- **GitHub Issues:** [ссылка на issues]
- **Email:** support@tenderai.com

## 🎉 Готово!

После выполнения всех шагов у вас будет:
- ✅ Фронтенд на Vercel с кастомным доменом
- ✅ API на Railway с автомасштабированием
- ✅ База данных на Neon с резервным копированием
- ✅ Интеграции WhatsApp и Telegram
- ✅ Автоматический деплой через GitHub Actions
- ✅ SSL сертификаты и безопасность
- ✅ Мониторинг и логирование

**Стоимость:** ~$0-15/месяц для малого проекта (бесплатные планы)

---

*Последнее обновление: декабрь 2024*
