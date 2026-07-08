# syntax=docker/dockerfile:1

# ---- base: install all dependencies (shared by dev & build) ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- dev: Vite dev server with HMR. Source is bind-mounted at runtime,
#      so code changes hot-reload with NO rebuild. ----
FROM base AS dev
COPY . .
CMD ["npm", "run", "dev"]

# ---- build: produce static assets ----
FROM base AS build
COPY . .
# In Docker (prod) the app calls the API via nginx at the relative path
# "/api/v1" — the same versioned base the backend mounts (see app.js) and the
# http helper's fallback. nginx proxies /api/ through to the backend.
ENV VITE_API_URL=/api/v1
RUN npm run build

# ---- serve: nginx serving the built assets (prod) ----
FROM nginx:1.27-alpine AS serve
# Substituted into nginx.conf at startup so the proxy targets the backend port.
ENV BACKEND_PORT=8081
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
