# 17 — Runbook de operación y entrega a la comisión

## Servidor

- Cloud Server en V2Networks, datacenter Ascenty SCL01 (Santiago). Ubuntu LTS. 4 vCPU, 8 GB RAM, 100 GB SSD.
- Docker y Docker Compose instalados. Usuario de despliegue sin sudo para la aplicación; sudo solo para Docker y firewall.
- Firewall: 22 (solo desde IPs del equipo), 80 y 443 abiertos. Nada más.
- SSH por clave; contraseña deshabilitada.

## Demo en VPS2 (hasta la adjudicación)

La demo corre en VPS2 (Hostinger, fuera de Chile), amparada en la respuesta 9 del foro (doc 18). Condiciones:
- Proyecto Compose propio (`docker compose -p carrera-demo`) con `db`, `web`, `worker` y `backup`, volúmenes
  propios y puertos solo en 127.0.0.1: nada compartido con el radar ni con los otros sitios.
- Subdominio dedicado (`demo-carrera.aeroconce.cl`) servido por el nginx ya existente en VPS2 como proxy inverso
  al contenedor `web`, con certificado de certbot. Caddy no se usa en VPS2 porque nginx ocupa 80 y 443.
- `.env` propio con `DOMINIO`, `DB_PASSWORD`, `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` del subdominio.
- Pasos (como root, repositorio en `/srv/carrera-aps`): registro DNS `A demo-carrera → 179.199.139.16`;
  `deploy/nginx-demo-carrera.conf` en `sites-available` + `sites-enabled` y `nginx -t && systemctl reload nginx`;
  `deploy/desplegar-vps2.sh` (construye la imagen, migra, siembra si la base está vacía y levanta `web` y `worker`
  con el perfil `demo` de Compose); `certbot --nginx -d demo-carrera.aeroconce.cl` cuando el DNS resuelva y, como certbot no lo agrega, HSTS en el
  bloque 443: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;` (`nginx -t`, reload).
  Actualizar: `git pull && deploy/desplegar-vps2.sh`. `web` escucha en 127.0.0.1:3060; `worker` sincroniza
  alertas a las 02:00 y respalda a las 03:00 (`scripts/worker.sh`).
- Al adjudicar, la producción se levanta en V2Networks (secciones siguientes) con base limpia y el reglamento
  real; la demo se apaga y sus datos ficticios se borran.

## Dominio y TLS

- Subdominio dedicado a la demo, por ejemplo `demo-carrera.aeroconce.cl`, apuntando por A al servidor.
- Caddy emite y renueva el certificado; verificar en `https://` que el candado es válido y que HSTS está presente antes de enviar credenciales.
- No usar el dominio de producción futuro: la demo se apaga o se reinicia al adjudicar.

## Variables de entorno (`.env`, fuera de git)

```
DOMINIO=demo-carrera.aeroconce.cl
DATABASE_URL=postgresql://app:***@db:5432/carrera
DB_PASSWORD=***
BETTER_AUTH_SECRET=***          # 32+ bytes aleatorios
BETTER_AUTH_URL=https://demo-carrera.aeroconce.cl
TZ=America/Santiago
AGE_RECIPIENT=age1...           # clave pública para cifrar respaldos
DOCUMENTOS_DIR=/data/documentos
LOG_DIR=/data/logs
```

Generar secretos con `openssl rand -base64 48`. Guardarlos en el gestor de contraseñas del equipo, no en chats.

## Despliegue inicial

```bash
git clone <repo> /srv/carrera-aps && cd /srv/carrera-aps
cp .env.example .env && editar .env
docker compose build
docker compose up -d db
docker compose run --rm web pnpm db:migrate
docker compose run --rm web pnpm auth:generate   # solo si cambió la config de Better Auth
docker compose run --rm web pnpm seed:demo
docker compose up -d
docker compose ps        # todos "healthy"
curl -I https://$DOMINIO # 200 y HSTS
```

## Despliegue de una versión

```bash
cd /srv/carrera-aps && git fetch && git checkout demo-lota-2026-09-25
docker compose build web worker
docker compose run --rm web pnpm db:migrate
docker compose up -d web worker
docker compose logs -f --tail=50 web   # sin errores en el arranque
```

Regla: antes de desplegar, la suite en verde en CI para esa etiqueta. Después, recorrer login y una ficha a mano.

## Recrear el seed de demo

Solo antes de enviar credenciales, nunca durante la evaluación:

```bash
docker compose run --rm web pnpm seed:demo --reset
```

El seed es determinista: produce siempre los mismos 250 funcionarios y los cuatro casos del doc 14.

## Respaldos

- `backup.sh` corre a las 03:00: `pg_dump` cifrado con `age`, adjuntos con `rsync`, registro en tabla `Respaldo`.
- Copia semanal al destino secundario (otro servidor chileno o bucket en Chile) con `rsync` sobre SSH.
- Restauración de prueba: `scripts/restaurar.sh <archivo>` en una base `carrera_restore`; comparar conteos con `scripts/comparar-conteos.sh`.
- Antes de enviar credenciales: una restauración exitosa registrada.

## Monitoreo

- Chequeo externo HTTP de `https://$DOMINIO/api/health` cada 5 minutos, con aviso por correo y mensaje al equipo si falla dos veces seguidas.
- `docker compose ps` con healthchecks; `restart: unless-stopped` en todos los servicios.
- Logs en `/data/logs`, rotación diaria, 30 días.

## Si la demo cae durante la evaluación

1. Confirmar desde fuera (el chequeo externo, el celular con datos móviles).
2. `docker compose ps` y `docker compose logs --tail=200 web db caddy`.
3. Casos típicos: `web` reiniciando por error (ver log, volver a la etiqueta anterior si hace falta); `db` sin espacio (`df -h`); certificado (Caddy no pudo renovar: revisar DNS y puerto 80).
4. Restaurar servicio primero, explicar después.
5. Registrar el incidente: hora de caída, hora de recuperación, causa, acción. Si la caída supera 15 minutos en horario hábil, avisar a la comisión por el mismo correo de las credenciales, con la hora de restauración. Es mejor que lo sepan por ti.

## Rotación de credenciales

- Las tres cuentas de demo se crean con contraseñas generadas de 16 caracteres. Se envían una sola vez.
- Si una contraseña se compromete, se cambia y se reenvía; no se desactiva la cuenta durante la evaluación.
- Después de la adjudicación (o del rechazo), se desactivan las cuentas y se apaga la demo. Los datos ficticios se borran.

## Entrega a la comisión

### Correo (tras subir la oferta al portal)

De: `<nombre>@aeroconce.cl` · Para: `licitacion.cf@daslota.cl` · Asunto: `Licitación 3019-20-LE26 – Acceso a plataforma de demostración – Aeroconce`

Cuerpo: identificación de la oferta (ID, razón social, RUT), URL, las tres cuentas con contraseña, compromiso de disponibilidad durante toda la evaluación, contacto técnico con teléfono, y la guía adjunta en PDF. Sin marketing.

### Guía de una página (PDF adjunto)

Encabezado con URL y cuentas. Luego una tabla con los 15 subcriterios en el orden de la pauta: subcriterio · dónde verlo (ruta de menú) · qué esperar. Ejemplo:

| # | Subcriterio | Dónde | Qué verá |
|---|---|---|---|
| 4 | Cálculo automático de bienios | Funcionarios → María Pérez → Experiencia y bienios | 6 bienios con fechas; próximo 01/03/2028; alerta activa |
| 5 | Capacitaciones con puntaje | Misma ficha → Capacitaciones | 2025: calculado 11, aplicado 10, excedente 1 → 2026 |
| 10 | Reportes históricos | Reportes → Resumen de carrera → Situación al 31/12/2024 | María Pérez en nivel 10 con 105 puntos |
| 12 | Entrega al término | Exportación integral → Generar | ZIP descargable con BD, diccionario y Excel |

Y un pie: "Los parámetros cargados son de demostración; en producción se configura el reglamento comunal vigente".

### Manual de usuario breve (PDF, 10 a 15 páginas)

Exigido por BT 9 en la implementación; para la demo es evidencia. Capítulos: entrar y perfiles · funcionarios y ficha · carrera (bienios, capacitación, estudios, niveles) · calificaciones · reportes y exportación · alertas · parámetros · auditoría y respaldos · portal del funcionario. Capturas reales de la versión congelada. Se genera desde markdown con la misma tubería de PDF del sistema.

## Después de la adjudicación

Si se adjudica: producción es una base nueva, sin seed, con el reglamento real, en el mismo servidor o en uno dedicado; la demo se conserva 30 días por si hay aclaraciones y luego se apaga. Si no: se apaga la demo, se conservan la etiqueta y las capturas, y el sistema queda como producto para la siguiente licitación de carrera funcionaria.
