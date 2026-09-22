#!/usr/bin/env bash
# Despliegue de la demo en VPS2 (doc 17): proyecto Compose `carrera-demo`, perfil `demo`.
# Idempotente: se puede repetir tras `git pull`. Uso (como root en el servidor):
#   /srv/carrera-aps/deploy/desplegar-vps2.sh            # construye, migra, siembra si está vacía y levanta
#   /srv/carrera-aps/deploy/desplegar-vps2.sh --sin-build # solo migra y reinicia con la imagen existente

set -euo pipefail
cd /srv/carrera-aps
DC="docker compose -p carrera-demo --profile demo"

if [ "${1:-}" != "--sin-build" ]; then
  $DC build
fi

$DC up -d db
# Espera a que la base esté sana
for i in $(seq 1 30); do
  if $DC ps db --format '{{.Health}}' 2>/dev/null | grep -q healthy; then break; fi
  sleep 2
done

$DC run --rm web pnpm db:migrate

# Arranque (ADMIN e institución) y demo solo si la base está vacía: nunca durante la evaluación
FUNCIONARIOS=$($DC exec -T db psql -U app -d carrera -tAc 'SELECT count(*) FROM "Funcionario"' 2>/dev/null || echo 0)
if [ "${FUNCIONARIOS//[[:space:]]/}" = "0" ]; then
  $DC run --rm web pnpm seed:bootstrap
  $DC run --rm web pnpm seed:demo
else
  echo "Base con ${FUNCIONARIOS} funcionarios: no se vuelve a sembrar"
fi

$DC up -d web worker
$DC ps
echo "Salud local:"
curl -fsS -H "Host: ${DOMINIO:-demo-carrera.aeroconce.cl}" "http://127.0.0.1:${PUERTO_WEB:-3050}/api/health" && echo
