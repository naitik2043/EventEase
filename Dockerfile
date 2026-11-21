FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .
COPY --from=build --chown=node:node /app/frontend/dist ./frontend/dist

USER node
EXPOSE 5000

CMD ["node", "server.js"]
