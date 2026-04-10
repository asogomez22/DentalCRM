# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_BASE_URL and VITE_CLINIC_SLUG must be passed as build args
# so Vite can bake them into the bundle at build time.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_CLINIC_SLUG=maxilart

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CLINIC_SLUG=$VITE_CLINIC_SLUG

RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback: all routes → index.html
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
