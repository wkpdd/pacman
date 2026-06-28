# syntax=docker/dockerfile:1.7

# ---- Build stage ----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first for cache friendliness.
COPY package.json package-lock.json ./
# Playwright is a dev dep used only on the host for the screenshot script;
# skip its postinstall browser download inside the container build.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --no-audit --no-fund

COPY . .
RUN npx tsc -b --noEmit \
 && npx vitest run \
 && npx vite build

# ---- Runtime stage --------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Serve the prod bundle. SPA + PWA cache headers come from the mounted conf.
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
# BusyBox wget ships in the alpine base image — no extra package needed.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
