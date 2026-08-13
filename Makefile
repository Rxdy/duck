# Duck — raccourcis de développement.
#
# `make` (ou `make help`) liste toutes les cibles.
# Les commandes npm restent utilisables directement dans front/ et back/ :
# ce fichier ne fait que les enchaîner et gérer la base Postgres autour.

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Base de données locale (mêmes valeurs que docker-compose.yml et les .env.example).
DATABASE_URL ?= postgres://duck:duck@localhost:5432/duck
export DATABASE_URL

# Ports surchargeables si un autre projet occupe déjà les valeurs par défaut :
# `make dev PORT=8100`. L'URL du serveur suit automatiquement côté front (Vite
# donne la priorité aux variables VITE_* de l'environnement sur front/.env).
PORT ?= 8080
FRONT_PORT ?= 5173
VITE_SERVER_WS_URL ?= ws://localhost:$(PORT)
export PORT VITE_SERVER_WS_URL

COMPOSE := docker compose

.PHONY: help install env dev dev-back dev-front lint lint-front lint-back \
        format format-fix typecheck typecheck-front typecheck-back \
        test test-front test-back build check \
        db-up db-down db-wait db-schema db-psql db-logs db-reset \
        up down build-images logs ps \
        sprites icons clean clean-db

##@ Aide

help: ## Affiche cette aide
	@awk 'BEGIN {FS = ":.*##"; printf "\nDuck — \033[1mmake <cible>\033[0m\n"} \
		/^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } \
		END { printf "\n" }' $(MAKEFILE_LIST)

##@ Installation

install: env ## Installe les dépendances de front/ et back/ (+ hooks Git)
	cd back && npm install
	cd front && npm install

env: ## Crée les .env manquants à partir des .env.example
	@for dir in back front; do \
		if [ ! -f "$$dir/.env" ]; then \
			cp "$$dir/.env.example" "$$dir/.env"; \
			echo "Créé $$dir/.env"; \
		fi; \
	done

##@ Développement

dev: db-up db-wait ## Lance Postgres + back + front — Ctrl+C arrête tout
	@echo "back  → ws://localhost:$(PORT)"; echo "front → http://localhost:$(FRONT_PORT)"; \
	trap 'kill 0' INT TERM EXIT; \
	(cd back && npm run dev) & \
	(cd front && npm run dev -- --port $(FRONT_PORT)) & \
	wait

dev-back: ## Serveur WebSocket seul, en watch (PORT, 8080 par défaut)
	cd back && npm run dev

dev-front: ## Client Vite seul, en watch (FRONT_PORT, 5173 par défaut)
	cd front && npm run dev -- --port $(FRONT_PORT)

##@ Qualité (mêmes étapes que la CI)

check: lint format typecheck test build ## Tout ce que vérifie la CI, en une commande

lint: lint-back lint-front ## ESLint sur front/ et back/
lint-back: ; cd back && npm run lint
lint-front: ; cd front && npm run lint

format: ## Vérifie le formatage Prettier (sans modifier)
	cd back && npm run format
	cd front && npm run format

format-fix: ## Reformate front/ et back/ avec Prettier
	cd back && npm run format:fix
	cd front && npm run format:fix

typecheck: typecheck-back typecheck-front ## Vérification TypeScript
typecheck-back: ; cd back && npm run typecheck
typecheck-front: ; cd front && npm run typecheck

test: test-back test-front ## Tests unitaires (Vitest) — démarre Postgres pour back/
test-back: db-up db-wait ## Tests back/ (nécessitent Postgres)
	cd back && npm test
test-front: ## Tests front/
	cd front && npm test

build: ## Build de production du front (dist/)
	cd front && npm run build

##@ Base de données

db-up: ## Démarre Postgres seul (:5432) en arrière-plan
	$(COMPOSE) up -d db

db-wait: ## Attend que Postgres accepte les connexions
	@for i in $$(seq 1 30); do \
		$(COMPOSE) exec -T db pg_isready -U duck -d duck >/dev/null 2>&1 && exit 0; \
		sleep 1; \
	done; \
	echo "Postgres n'a pas démarré à temps (voir make db-logs)." >&2; exit 1

db-down: ## Arrête Postgres (les données restent dans le volume)
	$(COMPOSE) stop db

db-schema: db-up db-wait ## Rejoue db/init/*.sql sur la base existante (idempotent)
	@$(COMPOSE) exec -T -e PGOPTIONS=-cclient_min_messages=warning db \
		sh -c 'for f in /docker-entrypoint-initdb.d/*.sql; do \
			echo "Applying $$(basename $$f)..."; \
			psql -U duck -d duck -v ON_ERROR_STOP=1 -f "$$f" >/dev/null; \
		done; echo "Schema up to date."'

db-psql: db-up db-wait ## Ouvre un shell psql sur la base locale
	$(COMPOSE) exec db psql -U duck -d duck

db-logs: ## Suit les logs de Postgres
	$(COMPOSE) logs -f db

db-reset: ## Détruit le volume Postgres et recrée une base vierge
	$(COMPOSE) rm -sfv db
	docker volume rm -f duck_db_data
	@$(MAKE) --no-print-directory db-up db-wait

##@ Docker (pile complète)

up: ## Démarre db + back + front en conteneurs (front sur :5173)
	$(COMPOSE) up --build -d

down: ## Arrête toute la pile
	$(COMPOSE) down

build-images: ## Reconstruit les images Docker sans démarrer
	$(COMPOSE) build

logs: ## Suit les logs de toute la pile
	$(COMPOSE) logs -f

ps: ## État des conteneurs
	$(COMPOSE) ps

##@ Rendu (vérification visuelle)

screenshot: ## Capture une page de l'app en 3D logicielle — URL=... OUT=shot.png
	@if [ -z "$(URL)" ]; then \
		echo "Usage : make screenshot URL=http://localhost:$(FRONT_PORT)/creatif [OUT=shot.png]"; \
		echo "        options : TOKEN=<jeton de session> WAIT=<sélecteur CSS>"; \
		echo "L'application doit tourner (make dev)."; exit 2; \
	fi
	node scripts/screenshot.mjs "$(URL)" "$(or $(OUT),shot.png)" \
		$(if $(TOKEN),--token=$(TOKEN)) $(if $(WAIT),--wait=$(WAIT))

##@ Art (scripts d'atelier, résultats commités)

sprites: ## Régénère les sprites du canard par couleur (Pillow requis)
	python3 scripts/generate-duck-sprites.py

icons: ## Régénère le favicon et les icônes PWA (Pillow requis)
	python3 scripts/generate-icons.py

##@ Nettoyage

clean: ## Supprime node_modules et les builds
	rm -rf back/node_modules front/node_modules front/dist

clean-db: down ## Arrête la pile et supprime le volume Postgres
	docker volume rm -f duck_db_data
