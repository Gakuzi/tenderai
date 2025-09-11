# 🚀 Полная инструкция по деплою TenderAI

## 📋 Что вам понадобится:
- Аккаунт GitHub
- Аккаунт Vercel (бесплатный)
- Аккаунт Neon (бесплатный)
- Google AI Studio API ключ (бесплатный)

---

## 1️⃣ Настройка GitHub репозитория

### Шаг 1: Создайте репозиторий на GitHub
1. Перейдите на https://github.com
2. Нажмите "New repository"
3. Название: `tenderai` (или любое другое)
4. Сделайте репозиторий публичным или приватным
5. НЕ добавляйте README, .gitignore, license (у нас уже есть)
6. Нажмите "Create repository"

### Шаг 2: Загрузите код в GitHub
В терминале выполните команды:
```bash
# Добавьте ваш GitHub репозиторий (замените YOUR_USERNAME на ваш логин)
git remote set-url origin https://github.com/YOUR_USERNAME/tenderai.git

# Загрузите код
git push -u origin main
```

---

## 2️⃣ Настройка Neon (PostgreSQL база данных)

### Шаг 1: Создайте аккаунт Neon
1. Перейдите на https://neon.tech
2. Нажмите "Sign Up"
3. Войдите через GitHub (рекомендуется)

### Шаг 2: Создайте проект
1. После входа нажмите "Create your first project"
2. Выберите регион: **EU (Frankfurt)** или **US East (Ohio)**
3. Название проекта: `tenderai`
4. Оставьте PostgreSQL 16
5. Нажмите "Create Project"

### Шаг 3: Скопируйте строку подключения
1. На странице проекта найдите раздел "Connection String"
2. Выберите "Pooled connection" 
3. Скопируйте строку вида:
   ```
   postgresql://username:password@host/database?sslmode=require
   ```
4. Сохраните эту строку - она понадобится для Vercel

---

## 3️⃣ Получение Google Gemini API ключа

### Шаг 1: Получите API ключ
1. Перейдите на https://aistudio.google.com
2. Войдите с Google аккаунтом
3. Нажмите "Get API key"
4. Создайте новый API key
5. Скопируйте ключ (он начинается с `AIza...`)

---

## 4️⃣ Деплой на Vercel

### Шаг 1: Создайте аккаунт Vercel
1. Перейдите на https://vercel.com
2. Нажмите "Sign Up"
3. Войдите через GitHub

### Шаг 2: Импортируйте проект
1. На главной странице Vercel нажмите "New Project"
2. Найдите ваш репозиторий `tenderai`
3. Нажмите "Import"

### Шаг 3: Настройте Environment Variables
В настройках проекта добавьте переменные окружения:

1. **DATABASE_URL**
   - Значение: строка подключения от Neon (из шага 2.3)
   
2. **JWT_SECRET** 
   - Значение: случайная строка 32+ символов, например:
   ```
   your_super_secret_jwt_key_for_production_2024_random_string_here
   ```
   
3. **GEMINI_API_KEY**
   - Значение: ключ от Google AI Studio (из шага 3)

4. **NODE_ENV**
   - Значение: `production`

### Шаг 4: Деплой
1. Нажмите "Deploy"
2. Дождитесь завершения сборки (2-3 минуты)

---

## 5️⃣ Миграция базы данных

### После успешного деплоя:

1. В Vercel перейдите в Settings → Functions
2. Или выполните локально с production строкой:

```bash
# В локальной копии проекта
# Измените DATABASE_URL в .env на production строку от Neon
DATABASE_URL="postgresql://..." npm run db:migrate

# Заполните базу тестовыми данными
DATABASE_URL="postgresql://..." npm run db:seed
```

---

## 6️⃣ Проверка работы

### Откройте ваше приложение:
- URL будет вида: `https://your-project-name.vercel.app`

### Войдите с тестовыми данными:
- **Администратор**: admin@tendera.ai / password
- **Менеджер**: manager@tendera.ai / password  
- **Аналитик**: analyst@tendera.ai / password
- **Клиент**: client@tendera.ai / password

---

## 7️⃣ Дополнительная настройка

### Для production готовности:
1. **Домен**: Подключите свой домен в Vercel
2. **SSL**: Автоматически от Vercel
3. **Мониторинг**: Используйте Vercel Analytics
4. **Backup**: Neon автоматически создает бэкапы

### Бесплатные лимиты:
- **Vercel**: 100GB трафика/месяц, неограниченные деплои
- **Neon**: 512MB хранилища, 1 млн запросов/месяц
- **Gemini**: 15 запросов/минуту, 1500/день

---

## 🆘 Проблемы и решения

### База данных не подключается:
- Проверьте строку подключения DATABASE_URL
- Убедитесь, что включен SSL в Neon

### Ошибки сборки:
- Проверьте, что все environment variables добавлены
- Убедитесь, что код загружен в GitHub

### Не работают API запросы:
- Проверьте CORS настройки
- Убедитесь, что JWT_SECRET одинаковый везде

---

## 🎯 Готово!

Ваше приложение TenderAI теперь работает в production с:
✅ Реальной PostgreSQL базой данных
✅ Безопасной аутентификацией  
✅ AI интеграциями
✅ Автоматическими деплоями через GitHub
✅ Бесплатным хостингом

**Следующие шаги:** Настройте реальные интеграции с Telegram Bot API, WhatsApp Business API, и email провайдерами.
