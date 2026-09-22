# Carrera APS — imagen de la aplicación (docs/10 y 17).
# Una sola imagen para `web` (Next.js) y `worker` (alertas y respaldos). Incluye Chromium de Playwright para
# imprimir los PDF de reportes y el cliente de PostgreSQL 16 para pg_dump. Node 24 y pnpm 11 como en desarrollo.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1 TZ=America/Santiago
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

# Dependencias del sistema: cliente PostgreSQL 16 (pg_dump de la misma versión que el servidor), age para cifrar
# respaldos, y las librerías que necesita Chromium (las instala Playwright con --with-deps).
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gnupg lsb-release age \
  && install -d /usr/share/postgresql-common/pgdg \
  && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update && apt-get install -y --no-install-recommends postgresql-client-16 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# El cliente de Prisma se genera en src/generated/prisma (fuera de git); DATABASE_URL no hace falta para generar
RUN pnpm db:generate && pnpm build

FROM base AS runtime
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/ms-playwright PORT=3000
COPY --from=build /app /app
# Chromium y sus dependencias del sistema, disponibles para el usuario `node`
RUN pnpm exec playwright install --with-deps chromium && chmod -R a+rX /ms-playwright \
  && mkdir -p /data/documentos /data/respaldos /data/logs && chown -R node:node /data /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
CMD ["pnpm", "start"]
