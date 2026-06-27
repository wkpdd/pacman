# syntax=docker/dockerfile:1.7

# ---- Build stage ----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first for cache friendliness
COPY package.json package-lock.json ./
# Playwright is a dev dep used only in the host's screenshot script; skip its
# postinstall browser download inside the container build.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --no-audit --no-fund

COPY . .
RUN npx tsc -b --noEmit \
 && npx vitest run \
 && npx vite build

# ---- Runtime stage --------------------------------------------------------
# Tiny nginx image to serve the prod bundle; supports the PWA service worker
# and falls back to index.html for client-side routing.
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

# SPA + PWA-friendly nginx config: long cache on hashed assets, no-cache on
# the shell and service worker so updates ship immediately.
RUN printf '%s\n' \
  'server {' \
  '  listen 80 default_server;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  gzip on;' \
  '  gzip_types text/css application/javascript application/json image/svg+xml;' \
  '  location = /sw.js { add_header Cache-Control "no-cache"; }' \
  '  location = /manifest.webmanifest { add_header Cache-Control "no-cache"; }' \
  '  location = /index.html { add_header Cache-Control "no-cache"; }' \
  '  location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }' \
  '  location / { try_files $uri $uri/ /index.html; }' \
  '}' \
  > /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
