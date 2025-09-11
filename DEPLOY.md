# Деплой TenderAI на Vercel + Neon PostgreSQL

## Подготовка к деплою

### 1. Создание аккаунта и проектов

1. **Регистрация на Neon** (бесплатная PostgreSQL база):
   - Перейти на https://neon.tech
   - Создать аккаунт
   - Создать новый проект PostgreSQL
   - Скопировать CONNECTION STRING

2. **Регистрация на Vercel** (бесплатный хостинг):
   - Перейти на https://vercel.com
   - Создать аккаунт
   - Подключить к GitHub

### 2. Настройка репозитория на GitHub

1. Создать новый репозиторий на GitHub
2. Загрузить код:
   ```bash
   git init
   git add .
   git commit -m "Initial commit with real database"
   git branch -M main
   git remote add origin https://github.com/yourusername/tenderai.git
   git push -u origin main
   ```

### 3. Настройка Vercel

1. В Vercel создать новый проект из GitHub репозитория
2. Добавить environment variables:
   - `DATABASE_URL` - строка подключения от Neon
   - `JWT_SECRET` - случайная строка 32+ символов
   - `GEMINI_API_KEY` - API ключ от Google Gemini

### 4. Миграция базы данных для продакшена

Обновить `prisma/schema.prisma` для PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Затем выполнить:
```bash
npx prisma migrate deploy
npx prisma db seed
```

## Локальная разработка vs Продакшен

**Локально**: SQLite (`DATABASE_URL="file:./dev.db"`)
**Продакшен**: PostgreSQL на Neon

## Команды для базы данных

- `npm run db:migrate` - применить миграции
- `npm run db:seed` - заполнить тестовыми данными
- `npm run db:studio` - открыть Prisma Studio
- `npm run db:generate` - сгенерировать Prisma Client

## Структура проекта для деплоя

```
tenderai/
├── api/                 # Vercel Serverless Functions  
├── lib/                 # Утилиты (Prisma, Auth)
├── prisma/             # База данных и миграции
├── services/           # API слой
├── components/         # React компоненты
├── pages/              # Страницы приложения
├── vercel.json         # Конфигурация Vercel
└── DEPLOY.md          # Эта инструкция
```

## Мониторинг

- Vercel Analytics - бесплатно
- Neon Dashboard - мониторинг базы данных
- Vercel Functions - логи API

## Масштабирование

При росте проекта:
- Neon Pro план - $20/месяц
- Vercel Pro план - $20/месяц
- Переход на dedicated PostgreSQL
