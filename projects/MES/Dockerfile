# ==========================================
# СТАДИЯ 1: СБОРКА (builder)
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci

COPY . .

# Сборка документации через pipeline (plugins.config.yaml → 33 ModuleDef)
RUN node ./plugins/run-pipeline.js --stage=all

COPY app-config.json ./build/app-config.json

# ==========================================
# СТАДИЯ 2: RUNTIME — С НАШИМ СЕРВЕРОМ
# ==========================================
FROM node:24-alpine

WORKDIR /app

COPY .npmrc /root/.npmrc

# Копируем только то, что нужно для работы сервера и статики
COPY --from=builder /app/build ./build
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./

# Ставим только production-зависимости (если они появятся)
RUN npm ci --omit=dev || true

# Создаем папку для БД и выдаем права пользователю node
RUN mkdir -p /app/data && chown -R node:node /app/data

# Запускаем от непривилегированного пользователя (безопасность)
USER node

EXPOSE 5050

# Запускаем наш сервер вместо http-server
CMD ["node", "server/server.js"]