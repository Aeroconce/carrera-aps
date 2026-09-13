# Carrera APS — Sistema de Gestión de Carrera Funcionaria (Ley 19.378)

Plataforma web para Departamentos de Salud municipales: cálculo automático de bienios, capacitación con
excedentes, niveles y proyección de ascenso, alertas, nueve reportes con situación a fecha, auditoría con
valor anterior y nuevo, respaldos acreditados y portal del funcionario. Primer destino: la demo para la
licitación 3019-20-LE26 del Departamento de Salud de Lota; después, producto para cualquier comuna.

## Documentación

Toda la especificación vive en [`docs/`](docs/00-README.md). Empieza por
[`docs/00-README.md`](docs/00-README.md) (índice y principios) y, antes de escribir código, lee
[`docs/15-convenciones-de-codigo.md`](docs/15-convenciones-de-codigo.md).

| Bloque | Documentos |
|---|---|
| Qué se construye | 01 alcance · 05 módulos y pantallas · 06 reportes · 11 objetivo de la demo · 13 flujos |
| Cómo se calcula | 03 modelo de datos · 04 motor de carrera · 14 parámetros de demostración y ejemplos |
| Con qué | 02 arquitectura · 10 stack y librerías · 12 diseño UI y textos · 15 convenciones |
| Cómo se asegura | 07 seguridad, auditoría y respaldos · 16 plan de pruebas · 17 runbook y entrega |
| En qué orden | 08 importación y datos demo · 09 plan de construcción |

## Stack

Node.js 24 · Next.js 16 (App Router) · TypeScript · PostgreSQL 16 · Prisma 7 · Better Auth ·
Tailwind CSS 4 · Vitest · Playwright · pnpm. Decisiones y alternativas descartadas en
[`docs/10-stack-y-librerias.md`](docs/10-stack-y-librerias.md).

## Desarrollo

```bash
pnpm install               # pnpm 11; los scripts de instalación permitidos están en pnpm-workspace.yaml
cp .env.example .env       # completar valores (ver docs/17-runbook-y-entrega.md)
docker compose up -d db    # PostgreSQL 16 en localhost:5436 (usuario app, base carrera)
pnpm db:migrate:dev        # aplica migraciones y regenera el cliente en src/generated/prisma (ignorado por git)
pnpm dev
```

Verificación: `pnpm lint`, `pnpm typecheck`, `pnpm test` (unitarios) y `pnpm build`.

Primer ADMIN e institución de demostración: `pnpm seed:bootstrap` (lee `SEED_ADMIN_EMAIL` y
`SEED_ADMIN_PASSWORD` de `.env`; la cuenta debe cambiar la contraseña al primer ingreso).

Pruebas de extremo a extremo (`docs/16`): `pnpm test:e2e` usa el servidor de desarrollo si está levantado
(o lo inicia), crea un usuario FUNCIONARIO de prueba con contraseña aleatoria por corrida y prueba el flujo
de acceso en tres viewports con auditoría de accesibilidad (axe). Requiere la base y el arranque anteriores.

## Estructura objetivo

Definida en `docs/02-arquitectura.md` y `docs/15-convenciones-de-codigo.md`; se va creando por fases
según `docs/09-plan-de-construccion.md`.

```
docs/             especificación (00 a 17)
prisma/           schema.prisma · migrations/ · seed/
src/app           rutas (App Router): (auth) · (admin) · (portal) · api
src/components    ui/ (shadcn) · dominio/
src/lib           motor/ · reglas/ · db/ · acciones/ · auditoria/ · reportes/ · exportacion/ · auth/
src/worker        alertas nocturnas y respaldos
tests/            motor/ · acciones/ · e2e/ · fixtures/
```
