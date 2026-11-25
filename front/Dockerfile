# Étape 1 : compile le site. Le résultat est statique et identique pour toutes les architectures : on le fait toujours
# sur la machine qui construit ($BUILDPLATFORM), sans émulation lente pour l'arm64 du Raspberry Pi.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Étape 2 : sert uniquement les fichiers compilés (cette étape suit l'architecture visée).
FROM nginx:1.27-alpine-slim
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1/ || exit 1
