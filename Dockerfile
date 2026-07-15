# ---- Stage 1: build the frontend (Vite) ----
FROM node:22-bookworm AS web
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY shared ./shared
COPY src ./src
RUN npm run build   # -> /web/dist

# ---- Stage 2: install server deps (incl. native better-sqlite3) ----
FROM node:22-bookworm AS serverdeps
WORKDIR /srv
COPY server/package.json server/package-lock.json ./
RUN npm ci

# ---- Stage 3: runtime ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=8787 \
    WEB_DIR=/app/dist \
    DATABASE_FILE=/data/orchestra.db
WORKDIR /app/server
COPY --from=serverdeps /srv/node_modules ./node_modules
COPY server/package.json server/tsconfig.json ./
COPY server/src ./src
COPY shared /app/shared
COPY --from=web /web/dist /app/dist
# persistent SQLite lives on a mounted volume
RUN mkdir -p /data
EXPOSE 8787
CMD ["node", "--import", "tsx", "src/index.ts"]
