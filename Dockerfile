# Pinned major version on purpose: better-sqlite3 and argon2 are native
# modules, a silent Node bump could break the build (PRD Q7).

FROM node:24-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts components.json tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public/ public/
COPY src/ src/
RUN npm run build

FROM node:24-slim AS server
# Toolchain fallback for native modules without prebuilt binaries.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=server /app/backend/dist /app/backend/dist
COPY --from=server /app/backend/drizzle /app/backend/drizzle
COPY --from=server /app/backend/node_modules /app/backend/node_modules
COPY --from=server /app/backend/package.json /app/backend/package.json
COPY --from=web /app/dist /app/dist
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "backend/dist/server.js"]
