# 15 — Convenciones de código

Reglas para que el proyecto sea coherente aunque lo escriban varias sesiones de Claude Code. Cada regla
tiene un porqué; si una situación no encaja, se documenta la excepción en el PR.

## Idioma

- **Dominio en español**: modelos, campos, rutas y textos de interfaz (`Funcionario`, `bienios`, `/reportes`). Es el vocabulario de las bases y de los usuarios.
- **Técnica en inglés**: nombres de funciones utilitarias, hooks, tipos genéricos, comentarios de infraestructura (`useDebounce`, `formatCurrency`, `auditLog`).
- Sin tildes ni eñes en identificadores (`categoria`, `anio`), con tildes en textos visibles.

## Estructura y capas

```
src/app         rutas y componentes de página (Server Components por defecto)
src/components  ui/ (shadcn) · dominio/ (FichaHeader, RielCarrera, DataTable…)
src/lib/motor   funciones puras, sin BD, sin fecha "hoy" implícita
src/lib/reglas  carga de reglas vigentes
src/lib/db      cliente Prisma, helpers de transacción y auditoría
src/lib/acciones  server actions por módulo, con validación Zod
src/lib/exportacion  xlsx, csv, pdf, integral
src/worker      alertas nocturnas, respaldos
tests           motor/, acciones/, e2e/
```

- Server Components para leer; **Server Actions para escribir**. No hay `fetch` a rutas propias desde el cliente salvo la API pública de lectura.
- Los componentes cliente (`"use client"`) solo donde hay interacción: formularios, tablas con estado, diálogos.

## Validación en el borde

- Toda server action recibe `FormData` o un objeto y lo valida con un esquema Zod antes de tocar la base. El esquema vive junto a la acción y se reutiliza en el formulario (react-hook-form + resolver).
- Fechas entran como `dd/mm/aaaa` y se convierten una sola vez; el motor recibe `Date` en `America/Santiago`.
- RUT se normaliza (`limpiar`) al entrar y se guarda sin puntos ni guion; se formatea al mostrar.

## Escritura con auditoría obligatoria

```ts
// src/lib/db/auditado.ts
export async function conAuditoria<T>(
  ctx: { usuarioId: string },
  accion: AccionAuditoria,
  entidad: string,
  fn: (tx: Prisma.TransactionClient) => Promise<{ resultado: T; entidadId: string; antes?: unknown; despues?: unknown }>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const r = await fn(tx);
    await tx.auditoria.create({ data: { usuarioId: ctx.usuarioId, accion, entidad, entidadId: r.entidadId, antes: r.antes ?? undefined, despues: r.despues ?? undefined, fecha: new Date() } });
    return r.resultado;
  });
}
```

Regla: **ninguna escritura fuera de `conAuditoria`**. ESLint con una regla propia (o revisión en PR) que rechace `prisma.<modelo>.create|update|delete` fuera de `src/lib/db`.

`antes` y `despues` contienen solo los campos que cambian, calculados con una utilidad `diffCampos(anterior, nuevo)`.

## Errores

- Las acciones devuelven `{ ok: true, data } | { ok: false, error: { codigo, mensaje, campos? } }`. Nunca lanzan al cliente.
- Mensajes de error para el usuario en español, concretos, sin disculpas (doc 12). Los detalles técnicos van al log, no a la pantalla.
- `error.tsx` y `not-found.tsx` en cada segmento principal; `global-error.tsx` con contacto.
- Logging con `pino` a archivo rotado (`/data/logs`), nivel `info` en producción, con `requestId`. Sin servicios externos.

## Motor de carrera

- Funciones puras: entrada explícita (datos + reglas + `fechaCorte`), salida inmutable. Prohibido `new Date()` dentro del motor.
- Aritmética con `Decimal` (Prisma) o enteros escalados; nunca `float` para puntajes.
- Cada regla nueva llega con su test antes de usarse en pantalla.

## Componentes

- Un componente de dominio por concepto (`RielCarrera`, `TablaCapacitaciones`), compuestos con los de `ui/`.
- Props tipadas, sin `any`. Sin lógica de negocio en componentes: llaman al motor o a acciones.
- `DataTable` genérica recibe columnas (`ColumnDef`) y datos; la variante móvil (tarjetas) se define en la misma columna con `meta.tarjeta`.
- Todo texto visible sale de un archivo de textos por módulo (`textos.ts`), no de literales sueltos, para mantener el glosario.

## Estilo

- Tailwind con los tokens del doc 12 definidos en `@theme` (`--color-institucional`, etc.). Prohibidos colores hex sueltos en componentes.
- `cn()` para combinar clases. Sin `style={{}}` salvo valores dinámicos (ancho del riel).
- Orden de clases con el plugin de Prettier para Tailwind.

## Calidad automática

- `tsc --noEmit` estricto (`strict`, `noUncheckedIndexedAccess`).
- ESLint: `next/core-web-vitals`, `next/typescript`, `jsx-a11y`.
- Prettier con `prettier-plugin-tailwindcss`.
- Hook `pre-commit` (lint-staged): prettier + eslint en archivos cambiados. Hook `pre-push`: `tsc` y `vitest run`.
- Sin `console.log` en código de producción (regla ESLint).

## Git

- Ramas: `main` (desplegable), `feat/<modulo>-<tema>`, `fix/<tema>`.
- Commits en español, imperativo, con alcance: `feat(carrera): reconocimiento masivo de bienios`, `fix(reportes): fecha de corte en zona horaria Chile`, `test(motor): excedente que caduca`.
- Un PR por módulo o flujo; la descripción enlaza el flujo del doc 13 y el subcriterio que cubre.
- La versión que ve la comisión se etiqueta `demo-lota-2026-09-25` y no recibe más commits hasta la adjudicación.

## Datos sensibles

- Nunca datos reales de personas en el repositorio, en fixtures ni en el seed.
- Variables de entorno en `.env` fuera de git; `.env.example` documentado.
- Los adjuntos se sirven solo por rutas autenticadas, nunca desde `/public`.
