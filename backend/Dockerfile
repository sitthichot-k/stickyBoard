# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
# Port the app listens on (driven from .env via docker-compose build args).
ARG BACKEND_PORT=8081
ENV NODE_ENV=production
ENV PORT=${BACKEND_PORT}
WORKDIR /app
COPY package*.json ./

# ---- dev: all deps + hot reload (nodemon). Source is bind-mounted at runtime,
#      so code changes need NO rebuild. ----
FROM base AS dev
ENV NODE_ENV=development
RUN npm install
COPY src ./src
EXPOSE ${BACKEND_PORT}
CMD ["npm", "run", "dev"]

# ---- prod: only production deps, baked source, non-root user ----
FROM base AS prod
RUN npm ci --omit=dev
COPY src ./src
EXPOSE ${BACKEND_PORT}
USER node
CMD ["node", "src/server.js"]
