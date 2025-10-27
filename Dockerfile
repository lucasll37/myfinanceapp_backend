# ---------- Base (compartilhado) ----------
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---------- Dev (hot reload com tsx) ----------
FROM base AS dev
ENV NODE_ENV=development
RUN npm install
COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
EXPOSE 3000
CMD ["npx", "tsx", "watch", "src/index.ts"]

# ---------- Builder (gera JS em dist + Prisma Client) ----------
FROM base AS builder
ENV NODE_ENV=production
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
RUN npx tsc

# ---------- Prod (leve e segura) ----------
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

# Dependências só de produção
COPY --from=base /app/package*.json ./
RUN npm ci --omit=dev

# Prisma Client já foi gerado no builder e está em node_modules
# Precisamos do schema/migrations em runtime para 'migrate deploy'
COPY --from=builder /app/prisma ./prisma

# Código compilado
COPY --from=builder /app/dist ./dist

# Instala a CLI do Prisma para rodar migrações em runtime (sem devDeps)
RUN npm install -g prisma

# Entrypoint: aplica migrações e inicia o servidor
# Use SKIP_MIGRATIONS=1 para pular migrações (ex.: em ambientes onde já rodou)
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -euo pipefail' \
  '' \
  'if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then' \
  '  echo ">> Running prisma migrate deploy..."' \
  '  prisma migrate deploy --schema=prisma/schema.prisma' \
  'fi' \
  '' \
  'echo ">> Starting app..."' \
  'exec node dist/index.js' \
  > /app/docker-entrypoint.sh \
  && chmod +x /app/docker-entrypoint.sh

EXPOSE 3000
USER node
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
