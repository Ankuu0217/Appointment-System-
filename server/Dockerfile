# syntax=docker/dockerfile:1
# Production image for the Appointments API.
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app

# Install production dependencies only (mongodb-memory-server is a devDependency and is not needed).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Run as the unprivileged "node" user that ships with the base image.
USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

# exec form so SIGTERM reaches Node and the graceful shutdown runs.
CMD ["node", "src/server.js"]
