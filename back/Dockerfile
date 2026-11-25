# Se construit depuis la RACINE du dépôt (contexte « . ») : l'image embarque le schéma SQL de db/init, que le serveur
# applique au démarrage (src/migrate.ts).
#   docker build -f back/Dockerfile -t duck-back .
#
# Pas encore de build compilé : le serveur tourne via tsx directement sur les sources TypeScript. L'installation des
# dépendances (production seulement) est séparée de la copie des sources pour garder l'image finale légère.
FROM node:22-alpine AS deps
WORKDIR /app

COPY back/package.json back/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY back/package.json ./
COPY back/src src
# Cartes officielles (lues depuis ./maps) ; le serveur peut y écrire (POST /maps), d'où le propriétaire.
COPY --chown=node:node back/maps maps
COPY db/init db/init

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s CMD wget -q --spider http://127.0.0.1:8080/health || exit 1
CMD ["node_modules/.bin/tsx", "src/index.ts"]
