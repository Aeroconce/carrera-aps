# 10 — Stack y librerías (decisión con verificación a septiembre de 2026)

Investigación hecha el 12/09/2026 sobre el estado real de cada componente. Donde el doc 02 decía "recomendado",
aquí queda decidido, con la alternativa descartada y por qué. Las versiones exactas se fijan al instalar
(`pnpm add` toma la última estable); lo que importa es la línea mayor y su estado de soporte.

## Criterios de selección

1. **Soporte durante 24 meses de contrato.** Nada que esté sin mantenimiento o en beta como pieza crítica.
2. **Sin dependencias en tiempo de ejecución fuera del servidor.** La demo no puede caer por un servicio externo, y BA 24c prohíbe procesar datos personales fuera de Chile.
3. **Lo que el equipo ya domina.** El radar corre con Next.js, Prisma, PostgreSQL, Vitest y pnpm. Repetir el stack reduce riesgo y tiempo.
4. **Exportaciones server-side** (XLSX, CSV, PDF) sin límites ni marcas.

## Decisión

| Capa | Elección | Línea / estado (sep 2026) | Alternativa descartada y por qué |
|---|---|---|---|
| Runtime | **Node.js 24** | Active LTS. Node 26 salió en mayo como Current y entra a LTS en octubre 2026; pasar a 26 en 2027 | Node 26 hoy: Current, no LTS; en producción se prefiere LTS |
| Framework | **Next.js 16.3** (App Router) | Active LTS; 15.5 es Maintenance LTS y termina en octubre 2026 | Next 15: se queda sin soporte durante el contrato |
| Lenguaje | **TypeScript** estricto | — | — |
| Base de datos | **PostgreSQL 16** | Estable, `pg_dump` para la exportación integral | SQLite: sin respaldo en caliente ni concurrencia razonable para 250 usuarios |
| ORM | **Prisma 7** | 7.10 estable; motor reescrito en TypeScript/WASM (ya no hay binario Rust); Prisma 8 en RC | Drizzle 0.45 (1.0 en beta): excelente, pero el equipo ya usa Prisma y no hay ventaja que justifique cambiar aquí; volver a evaluar para el radar, no para esto |
| Autenticación | **Better Auth** con `@better-auth/prisma-adapter` y plugin `admin` | Auth.js (NextAuth) anunció que pasa a formar parte de Better Auth y recomienda Better Auth para proyectos nuevos; el adapter de Prisma está en 1.7.x | Auth.js: en modo mantenimiento. Sesiones a mano: más código propio que auditar, sin rate limiting ni políticas de contraseña incluidas |
| UI | **Tailwind CSS 4** + **shadcn/ui sobre Base UI** | shadcn usa Base UI por defecto para proyectos nuevos desde julio 2026; los componentes se copian al repo | Frameworks de componentes opacos (MUI, Ant): más peso y menos control. Hacer todo a mano: diálogos, selects y combobox accesibles son difíciles de hacer bien |
| Tablas | **TanStack Table 9** (headless) | 9.2.x, con ejemplo oficial para shadcn/Base UI | Grids comerciales: innecesarios |
| Formularios | **react-hook-form** + `@hookform/resolvers` + Zod, envío por Server Actions | Estándar por defecto en 2026; soporta Zod 4 vía Standard Schema | TanStack Form: mejor inferencia, pero API más nueva; Conform: solo si progressive enhancement fuera requisito |
| Validación | **Zod** | Estable, integra con formularios y con la API | — |
| Fechas | **date-fns 4** con `@date-fns/tz` | Sin dependencias, funciones puras para el motor | Temporal nativo: viene activado por defecto solo en Node 26; usarlo cuando se migre |
| Excel (escribir y leer) | **ExcelJS** | MIT, ~1,9M descargas semanales, API estable; **sin release significativo desde octubre 2023 y sus mantenedores lo declaran inactivo** | SheetJS Community: la versión gratuita en npm está abandonada con vulnerabilidades sin corregir. `@office-kit/xlsx` y `modern-xlsx`: prometedores pero pre-1.0 en 2026. ExcelJS se elige por estabilidad, no por actividad; ver riesgo abajo |
| PDF | **Playwright** (Chromium) en el servidor, imprimiendo la misma vista HTML del reporte | Misma salida que Puppeteer (ambos usan el Chrome DevTools Protocol); mejor tipado y documentación para `page.pdf()` en 2026 | `@react-pdf/renderer`: más liviano, pero obliga a mantener una segunda maqueta de cada reporte. `pdfmake`: otra sintaxis propia. Puppeteer: equivalente; Playwright tiene mejor DX |
| CSV | Nativo (escritura directa con escape RFC 4180) | — | Librerías: innecesarias |
| RUT chileno | **Implementación propia** (módulo 11, ~30 líneas, con tests) | — | Paquetes npm existentes: casi todos sin actualizar hace 4-5 años; el algoritmo es trivial y no vale una dependencia |
| Jobs | `node-cron` dentro del proceso `worker` | — | BullMQ/Redis: sobredimensionado para tres tareas nocturnas |
| Tests | **Vitest 4** | Mismo que el radar | — |
| Gestor de paquetes | **pnpm** | Mismo que el radar | — |
| Contenedores | **Docker Compose** | `web`, `worker`, `db`, `caddy`, `backup` | — |
| Proxy y TLS | **Caddy 2** | Certificados Let's Encrypt automáticos, HSTS con una línea | nginx + certbot: más pasos manuales, sin ventaja |
| Almacenamiento de adjuntos | Disco local del servidor (`/data/documentos`), respaldado | En Chile, sin terceros (BA 24c) | S3/R2/GCS: fuera de Chile o tercero adicional a autorizar |
| Respaldos | `pg_dump` + `age` (cifrado) + `rsync` a destino secundario en Chile | — | — |
| Monitoreo de disponibilidad | Chequeo externo HTTP cada 5 min (cualquier servicio de uptime) + `healthcheck` en Compose | Solo lee el estado; no procesa datos personales | — |

## Notas de integración

### Better Auth con el modelo de datos del doc 03

Better Auth genera sus propias tablas (`user`, `session`, `account`, `verification`) vía
`npx @better-auth/cli generate`. El modelo `Usuario` del doc 03 se ajusta así:

- `user` de Better Auth reemplaza a `Usuario`. Se agregan campos adicionales con `additionalFields`: `rol` (ADMIN | SUPERVISION | FUNCIONARIO), `institucionId`, `funcionarioId`, `debeCambiarPassword`.
- Plugin `admin`: roles, baneo, revocación de sesiones, creación de usuarios por administrador (sin registro público: `emailAndPassword.disableSignUp` o equivalente).
- Rate limiting y política de contraseñas: opciones nativas de Better Auth.
- `Acceso` (registro de accesos, BT 3.2) se mantiene como tabla propia, poblada desde los hooks de Better Auth (`after` de sign-in, éxito y fallo).
- Sesiones en base de datos (no JWT stateless): permite revocar y cumple "registro de accesos".

### Playwright para PDF

- Imagen Docker: partir de `mcr.microsoft.com/playwright:v<versión>-noble` para `web` (trae Chromium y dependencias) o instalar `chromium` con `playwright install --with-deps chromium` en la imagen propia.
- Un solo `browser` compartido por proceso, `page` por solicitud, cierre garantizado; cola de máximo 2 renders simultáneos.
- El reporte se renderiza en una ruta interna `/reportes/<id>/imprimir?token=…` con CSS de impresión (`@page` apaisado, encabezado institucional, numeración). El PDF es esa página impresa, así pantalla y PDF nunca divergen.
- Memoria: reservar ~500 MB para Chromium en el servidor de 8 GB. Sobra.

### ExcelJS: riesgo y mitigación

ExcelJS funciona y es lo más usado, pero está inactivo. Mitigación:
- Encapsular toda la generación en `src/lib/exportacion/xlsx.ts` con una interfaz propia (`crearLibro`, `agregarHoja`, `escribir`). Si hay que cambiar de librería, se cambia un archivo.
- Fijar la versión exacta en `package.json` (sin `^`) y revisar `pnpm audit` en cada despliegue.
- Reevaluar `@office-kit/xlsx` cuando llegue a 1.0.

### Fechas y zona horaria

Todo se almacena en UTC; toda presentación y todo cálculo de bienios se hace en `America/Santiago` con
`@date-fns/tz`. Un bienio que se cumple "el 15 de marzo" debe cumplirse el 15 de marzo en Chile, no en UTC.

### RUT

`src/lib/rut.ts`: `limpiar`, `validar` (módulo 11, acepta K), `formatear` (`12.345.678-9`), `generarConDv`
(para el seed). Tests con los casos de borde: dígito K, RUT bajo 1.000.000, ceros a la izquierda.

## `package.json` de partida

```json
{
  "name": "carrera-aps",
  "private": true,
  "packageManager": "pnpm@10",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "worker": "tsx src/worker/index.ts",
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "seed:demo": "tsx prisma/seed/demo.ts",
    "auth:generate": "better-auth generate"
  },
  "dependencies": {
    "next": "16.3.x",
    "react": "19.x",
    "react-dom": "19.x",
    "@prisma/client": "7.x",
    "better-auth": "1.x",
    "@better-auth/prisma-adapter": "1.x",
    "zod": "4.x",
    "react-hook-form": "7.x",
    "@hookform/resolvers": "5.x",
    "@tanstack/react-table": "9.x",
    "lucide-react": "latest",
    "sonner": "latest",
    "pino": "9.x",
    "date-fns": "4.x",
    "@date-fns/tz": "1.x",
    "exceljs": "4.4.0",
    "playwright": "1.x",
    "node-cron": "3.x"
  },
  "devDependencies": {
    "prisma": "7.x",
    "typescript": "5.x",
    "vitest": "4.x",
    "tsx": "4.x",
    "tailwindcss": "4.x",
    "@types/node": "24.x",
    "eslint": "9.x",
    "eslint-plugin-jsx-a11y": "6.x",
    "prettier": "3.x",
    "prettier-plugin-tailwindcss": "0.6.x",
    "@playwright/test": "1.x",
    "@axe-core/playwright": "4.x",
    "@testing-library/react": "16.x",
    "jsdom": "latest"
  }
}
```

Las `x` se resuelven a la última estable al instalar; `exceljs` va fijo.

## `docker-compose.yml` de partida

```yaml
services:
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [web]

  web:
    build: .
    environment:
      DATABASE_URL: postgresql://app:${DB_PASSWORD}@db:5432/carrera
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: https://${DOMINIO}
      TZ: America/Santiago
    volumes:
      - documentos:/data/documentos
    depends_on: [db]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s

  worker:
    build: .
    command: pnpm worker
    environment: *web_env
    volumes:
      - documentos:/data/documentos
    depends_on: [db]

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: carrera
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  backup:
    image: postgres:16
    entrypoint: ["/bin/sh", "/backup.sh"]
    environment:
      PGPASSWORD: ${DB_PASSWORD}
      AGE_RECIPIENT: ${AGE_RECIPIENT}
    volumes:
      - ./backup.sh:/backup.sh
      - backups:/backups
      - documentos:/data/documentos:ro
    depends_on: [db]

volumes:
  pgdata:
  documentos:
  backups:
  caddy_data:
```

`Caddyfile`:
```
{$DOMINIO} {
  reverse_proxy web:3000
  header Strict-Transport-Security "max-age=31536000; includeSubDomains"
  header X-Content-Type-Options nosniff
  header X-Frame-Options DENY
}
```

## Lo que NO se usa, y por qué

- **Ningún servicio de terceros en tiempo de ejecución** (analítica, fuentes desde CDN, correo transaccional externo con datos personales, almacenamiento en nube extranjera). Motivos: disponibilidad de la demo y BA 24c.
- **Ningún framework de componentes opaco** (MUI, Ant). shadcn/ui sí: es código propio con primitivas accesibles de Base UI; ver doc 12.
- **Ningún motor de reportes externo** (JasperReports, servicios de PDF por API). Los reportes son HTML que se imprime.

## Referencias consultadas (12/09/2026)

- Next.js blog y endoflife.date: 16.3 Active LTS, 15.5 Maintenance LTS hasta octubre 2026.
- Comparativas Prisma vs Drizzle (Bytebase, Encore, Makerkit): Prisma 7 sin motor Rust, 7.10 estable, 8 en RC; Drizzle 0.45, 1.0 en beta.
- Anuncio en el repositorio de next-auth: Auth.js pasa a formar parte de Better Auth; se recomienda Better Auth para proyectos nuevos.
- npm `@better-auth/prisma-adapter` 1.7.x; docs de Better Auth (adapter Prisma, plugin admin con roles).
- Repositorio `@office-kit/xlsx`: estado del ecosistema xlsx en 2026 (ExcelJS inactivo desde octubre 2023, SheetJS Community sin escritura con estilos, excel4node archivado).
- PDF4.dev y APITemplate: Playwright y Puppeteer usan el mismo motor; Playwright recomendado para proyectos nuevos en 2026.
- Node.js: 24 Active LTS, 26 Current desde mayo 2026 y LTS en octubre 2026; cambio de calendario de releases desde 27.
