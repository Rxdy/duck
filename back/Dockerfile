# Étape actuelle du projet : pas encore de build compilé, le serveur tourne
# via tsx directement sur les sources TypeScript. On sépare quand même
# l'installation des deps (prod uniquement) de la copie des sources pour
# garder l'image finale la plus légère possible.
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src src

USER node
EXPOSE 8080
CMD ["node_modules/.bin/tsx", "src/index.ts"]
