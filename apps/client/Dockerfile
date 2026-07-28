FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/protocol/package.json packages/protocol/package.json
COPY apps/client/package.json apps/client/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/protocol packages/protocol
COPY apps/client apps/client
RUN npm run build --workspace apps/client

FROM nginx:alpine
COPY --from=build /repo/apps/client/dist /usr/share/nginx/html
EXPOSE 80
