# TenderAI Dockerfile с поддержкой долгоживущих браузерных сессий
FROM node:18-alpine

# Устанавливаем необходимые системные пакеты для Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    dbus \
    && rm -rf /var/cache/apk/*

# Настройка пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Настройка переменных окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_BIN="/usr/bin/chromium-browser"
ENV PUPPETEER_NO_SANDBOX=true

# Настройки для production
ENV NODE_ENV=production
ENV SESSION_STORAGE_TYPE=file
ENV HEALTH_CHECK_INTERVAL=300000
ENV AUTO_RECONNECT=true
ENV SESSION_TTL=7776000

# Puppeteer конфигурация для облачной среды
ENV PUPPETEER_HEADLESS=true
ENV PUPPETEER_USER_DATA_DIR=/app/sessions

# Настройки для Discord/Chrome в контейнере
ENV DISPLAY=:99
ENV DBUS_SESSION_BUS_ADDRESS=/dev/null

# Создаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Создаем директории для сессий и логов
RUN mkdir -p /app/sessions /app/logs && \
    chown -R nodejs:nodejs /app

# Копируем исходный код приложения
COPY --chown=nodejs:nodejs . .

# Сборка TypeScript (если необходимо)
RUN npm run build 2>/dev/null || true

# Создаем скрипт для инициализации браузера
RUN echo '#!/bin/sh\necho "Initializing headless browser environment..."\n' > /app/init-browser.sh && \
    chmod +x /app/init-browser.sh

# Переключаемся на непривилегированного пользователя
USER nodejs

# Экспортируем порты
EXPOSE 3000 3001

# Health check для контейнера
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Команда запуска
CMD ["npm", "run", "start:sessions"]
