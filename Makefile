# ========================================
# Makefile
# Dockerfile
# Desenvolvimento: npm run dev localmente
# ========================================

.PHONY: help db build up down restart logs shell clean

## help: Mostra comandos disponíveis
help:
	@echo "Comandos disponíveis:"
	@echo ""
	@echo "  make db     	- Sobe somente um SGBD PostgreSQL"
	@echo "  make build     - Construir imagem de produção"
	@echo "  make up        - Iniciar containers"
	@echo "  make down      - Parar containers"
	@echo "  make restart   - Reiniciar containers"
	@echo "  make logs      - Ver logs"
	@echo "  make shell     - Acessar shell do container"
	@echo "  make clean     - Limpar tudo"
	@echo ""

## db: Sobe somente o banco de dados PostgreSQL
db:
	@echo "🗄️  Iniciando banco de dados PostgreSQL..."
	docker compose -f docker-compose_db.yml up -d

## build: Construir imagem
build:
	@echo "🔨 Construindo imagem..."
	docker compose build --no-cache

## up: Iniciar containers
up:
	@echo "🚀 Iniciando containers..."
	docker compose up -d

## down: Parar containers
down:
	@echo "⏹️  Parando containers..."
	docker compose down

## restart: Reiniciar
restart: down up

## logs: Ver logs
logs:
	docker compose logs -f

## shell: Acessar container
shell:
	docker compose exec api sh

## clean: Limpar tudo
clean:
	@echo "🧹 Limpando..."
	docker compose down -v
	docker system prune -f

## dev: Lembrete para desenvolvimento local
dev:
	@echo "ℹ️  Para desenvolvimento, use:"
	@echo "   npm install"
	@echo "   npm run dev"