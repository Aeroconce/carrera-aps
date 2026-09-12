<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Carrera APS — guía para agentes

- Proyecto: Sistema de Gestión de Carrera Funcionaria APS (Ley 19.378). La especificación completa está en `docs/`; empezar por `docs/00-README.md`.
- Antes de escribir código: `docs/15-convenciones-de-codigo.md` (idioma, capas, auditoría obligatoria, errores, estilo, git) y `docs/12-diseno-ui-y-textos.md` (sistema visual, glosario, textos).
- Reglas de negocio en `docs/04-motor-de-carrera.md`; modelo de datos en `docs/03-modelo-de-datos.md`; valores de demostración en `docs/14-parametros-demo-y-ejemplos.md`. Los valores normativos nunca van en código: son parámetros con vigencia.
- Stack verificado en `docs/10-stack-y-librerias.md`. Prisma 7 (cliente generado en `src/generated/prisma`), Better Auth, Tailwind 4, Vitest, Playwright, pnpm 11. Ningún servicio externo en tiempo de ejecución.
- Orden de construcción y checklists en `docs/09-plan-de-construccion.md`; pruebas en `docs/16-plan-de-pruebas-y-calidad.md`; operación y entrega en `docs/17-runbook-y-entrega.md`.
- Skills de Prisma en `.claude/skills/` (prisma-cli, prisma-client-api, prisma-database-setup): copias de github.com/prisma/skills tomadas el 2026-09-12; sin lock ni herramienta de sincronización.
