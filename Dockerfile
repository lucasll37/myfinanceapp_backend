# ========================================
# Dockerfile para Produção
# Para desenvolvimento, use: npm run dev
# ========================================

# ---------- Stage 1: Dependencies ----------
FROM node:22-alpine AS dependencies

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --omit=dev --ignore-scripts

# ---------- Stage 2: Build ----------
FROM node:22-alpine AS build

WORKDIR /app

# Copiar dependências de dev para build
COPY package*.json ./
RUN npm install

# Copiar código fonte e configurações
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Gerar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# ---------- Stage 3: Production ----------
FROM node:22-alpine AS production

# Instalar apenas ferramentas necessárias
RUN apk add --no-cache tini curl

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Copiar dependências de produção do stage 1
COPY --from=dependencies /app/node_modules ./node_modules

# Copiar código compilado do stage 2
COPY --from=build /app/dist ./dist

# Copiar Prisma (necessário para migrations)
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated

# Criar script de entrypoint
RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -e' \
    '' \
    'echo "🚀 Starting production server..."' \
    '' \
    '# Executar migrations (se não desabilitado)' \
    'if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then' \
    '    echo "🔄 Running database migrations..."' \
    '    npx prisma migrate deploy' \
    'fi' \
    '' \
    'echo "✅ Server starting on port ${PORT:-3000}"' \
    '' \
    '# Iniciar aplicação' \
    'exec node dist/server.js' \
    > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Usar tini como init system
ENTRYPOINT ["/sbin/tini", "--"]

# Executar entrypoint
CMD ["/app/entrypoint.sh"]