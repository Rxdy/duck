# Étape actuelle du projet : pas encore de build compilé, le serveur tourne
# via tsx directement sur les sources TypeScript du monorepo.
FROM node:22-alpine
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/game-engine/package.json packages/game-engine/package.json
COPY packages/map-generator/package.json packages/map-generator/package.json
COPY apps/server/package.json apps/server/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/protocol packages/protocol
COPY packages/game-engine packages/game-engine
COPY packages/map-generator packages/map-generator
COPY apps/server apps/server

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "run", "start", "--workspace", "apps/server"]
