FROM node:24-alpine AS builder

ARG INSTALL_PLANTUML=false

WORKDIR /app

## 1. Устанавливаем Java (openjdk), Graphviz (нужен PlantUML для рисовки графов) и сам PlantUML
# RUN apk add --no-gradable --no-cache \
#    openjdk17-jre \
#    graphviz \
#    ttf-dejavu \
#    fontconfig \
#    plantuml

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci 

# Копируем исходники
COPY . .

# 2. Если plantuml.jar закоммичен в репозиторий по пути docs/_assets/jar/plantuml.jar, 
#    наш getPlantUmlCommand подхватит его сам. 
#    Если же .jar файла нет в репозитории, явное указание PLANTUML_JAR_PATH не требуется — 
#    скрипт автоматически переключится на системный `plantuml`, который мы установили выше через apk.

# Сборка документации
RUN npx rimraf build && \
    NODE_PATH=/app/node_modules \
    node ./plugins/diplodoc-helper-cli.js helpMap && \
    node ./plugins/diplodoc-helper-cli.js tocCleanMode && \
    node ./plugins/diplodoc-helper-cli.js periodicStat && \
    node ./plugins/diplodoc-helper-cli.js contexts && \
    node ./plugins/diplodoc-helper-cli.js helptags && \
    node ./plugins/diplodoc-helper-cli.js roadMap --dataPath ./plugins/roadMap/roadmap-data.json && \
    npx @diplodoc/cli -i ./docs -o ./build --allow-custom-resources --apply-presets internal --strict && \
    node ./plugins/diplodoc-helper-cli.js footnoteAnchors ./build && \
    node ./plugins/diplodoc-helper-cli.js breadcrumb ./build && \
    node ./plugins/diplodoc-helper-cli.js contexttags ./build && \
    node ./plugins/diplodoc-helper-cli.js ganttFixScroll ./build && \
    node ./plugins/diplodoc-helper-cli.js periodicTable && \
    node ./plugins/diplodoc-helper-cli.js periodicTableHelpTag && \
    node ./plugins/diplodoc-helper-cli.js periodicTableContext && \
    npx rimraf build/.yfm build/.yfmignore build/.yfmlint

# Копируем конфиг в папку сборки, которую раздаёт http-server
COPY app-config.json ./build/app-config.json

# --- Образ для сервера ---
FROM node:24-alpine

WORKDIR /app

COPY .npmrc /root/.npmrc
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev || true

EXPOSE 5050
CMD ["npx", "http-server", "./build", "--port", "5050", "--cors"]