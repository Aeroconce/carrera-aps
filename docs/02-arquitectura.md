# 02 — Arquitectura

> La decisión final de stack, con versiones verificadas y alternativas descartadas, está en `10-stack-y-librerias.md`. Este documento describe la estructura y el despliegue.

## Stack recomendado

El mismo del radar, para reutilizar patrones, componentes y la experiencia del equipo:

| Capa | Elección | Razón |
|---|---|---|
| Aplicación | Next.js (App Router) + TypeScript | Web 100% (subcriterio 1), responsive (2), un solo despliegue |
| Base de datos | PostgreSQL 16 | Transacciones, JSON para snapshots de reglas, `pg_dump` para la exportación integral |
| ORM | Prisma | Migraciones versionadas, tipos, mismo flujo que el radar |
| UI | Tailwind + componentes propios | Responsive sin trabajo extra; evitar librerías pesadas |
| Reportes | Generación server-side: XLSX (`exceljs`), CSV nativo, PDF con Playwright imprimiendo la misma vista HTML | Exportación sin restricciones (subcriterio 11, BT 13); ver doc 10 |
| Autenticación | Better Auth (adapter Prisma, plugin admin), sesiones en base de datos | BT 3.2; rate limiting y políticas de contraseña incluidas; ver doc 10 |
| Jobs | Un worker en el mismo proceso o `cron` del sistema | Recalculo nocturno de alertas, respaldos |
| Contenedores | Docker Compose: `web`, `db`, `backup` | Reproducible en el VPS |
| Proxy y TLS | Caddy (certificado automático Let's Encrypt) | HTTPS acreditado (subcriterio 3) sin gestión manual |

Cualquier stack equivalente sirve; lo que no es negociable: web puro, responsive, HTTPS, exportaciones
server-side y base relacional con respaldos automatizables.

## Estructura del proyecto

```
carrera-aps/
├── docs/                      # esta documentación
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/                  # datos de demo (ver doc 08)
├── src/
│   ├── app/
│   │   ├── (auth)/login
│   │   ├── (admin)/           # módulos administrativos
│   │   │   ├── funcionarios/
│   │   │   ├── carrera/       # bienios, capacitación, estudios, niveles
│   │   │   ├── calificaciones/
│   │   │   ├── documentos/
│   │   │   ├── reportes/
│   │   │   ├── alertas/
│   │   │   ├── parametros/    # reglamento comunal, vigencias
│   │   │   ├── auditoria/
│   │   │   ├── respaldos/
│   │   │   ├── importar/
│   │   │   └── exportacion-integral/
│   │   ├── (portal)/mi-carrera   # portal del funcionario
│   │   └── api/               # endpoints de lectura para integración (BT 12)
│   ├── lib/
│   │   ├── motor/             # cálculo de carrera: puro, sin BD, testeable
│   │   │   ├── bienios.ts
│   │   │   ├── capacitacion.ts
│   │   │   ├── estudios.ts
│   │   │   ├── niveles.ts
│   │   │   ├── proyeccion.ts
│   │   │   └── snapshot.ts    # cálculo "a fecha"
│   │   ├── reglas/            # carga de parámetros vigentes a una fecha
│   │   ├── auditoria/
│   │   ├── reportes/
│   │   ├── exportacion/
│   │   └── auth/
│   └── worker/                # alertas nocturnas, respaldos
├── tests/
│   ├── motor/                 # casos de cálculo con valores conocidos
│   └── fixtures/
└── docker-compose.yml
```

El **motor de carrera vive en `src/lib/motor` como funciones puras**: reciben un funcionario con su
historial y las reglas vigentes, devuelven bienios, puntajes, nivel y proyección. Sin acceso a base de
datos. Así se prueba con casos de la ley y se reutiliza para el cálculo "a fecha" de los reportes históricos.

## Hosting y despliegue

- **Proveedor de producción**: V2Networks, Cloud Server en datacenter Ascenty SCL01, Santiago (BA 24c exige datos en Chile y proveedor individualizado y autorizado por escrito; la adjudicación no reemplaza esa autorización, respuesta 8 del foro).
- **Demo hasta la adjudicación**: VPS2 (Hostinger, fuera de Chile), permitido por la respuesta 9 del foro con el compromiso de mover los datos a Chile al adjudicar. Subdominio propio, contenedores y base separados del resto del servidor. En la oferta se declara citando la respuesta 9.
- **Servidor de referencia**: 4 vCPU, 8 GB RAM, 100 GB SSD, Ubuntu LTS. Sobra para 250 funcionarios; el margen es para reportes globales y respaldos.
- **Dominio**: subdominio propio de Aeroconce (por ejemplo `carrera.aeroconce.cl` para la demo; `lota.carrera-aps.cl` o similar en producción). TLS válido siempre.
- **Ambientes**: `demo` (el que ve la comisión, congelado desde el envío de credenciales) y `dev`. Producción real se crea al adjudicar, con base limpia.
- **Monitoreo**: chequeo externo de disponibilidad cada 5 minutos con alerta al equipo. La demo caída durante la evaluación es inadmisibilidad (BT 11).

## Respaldos (subcriterio 15 exige "acreditado")

- `pg_dump` diario comprimido y cifrado, retención 30 días en el servidor y copia a almacenamiento separado (otro servidor o bucket en Chile).
- Respaldo de archivos adjuntos (documentos de funcionarios) con la misma política.
- Registro de cada respaldo en tabla `Respaldo` (fecha, tamaño, destino, hash, resultado) y **pantalla en el módulo de administración** que lo muestre. Eso, más la política escrita y la evidencia del proveedor de hosting, es lo que convierte "respaldo sin evidencia clara" (50) en "respaldo periódico acreditado" (100).
- Prueba de restauración documentada antes de enviar la demo.

## Rendimiento y disponibilidad

- 250 funcionarios y unos miles de registros: no hay problema de escala. El riesgo es de disponibilidad, no de carga.
- Sin dependencias de red externas en tiempo de ejecución: fuentes, íconos y librerías servidos localmente. Una CDN caída no puede tumbar la demo.
- Página de error amigable con correo de contacto, por si algo falla mientras la comisión evalúa.

## Seguridad de base

- Cookies httpOnly + SameSite, CSRF en formularios, límite de intentos de login, bloqueo temporal.
- Cifrado en tránsito (TLS) y cifrado del disco o de los respaldos en reposo.
- Cabeceras de seguridad (HSTS, CSP básica, X-Frame-Options).
- Contraseñas con Argon2id; obligación de cambio en primer ingreso para cuentas creadas por administrador.
- Registro de accesos (BT 3.2): cada login exitoso y fallido con IP y fecha.
