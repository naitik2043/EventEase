FROM node:24-alpine

LABEL org.opencontainers.image.title="EventEase API" \
      org.opencontainers.image.description="Backend-only event management REST API" \
      org.opencontainers.image.source="https://github.com/naitik2043/EventEase" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

USER node
EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
