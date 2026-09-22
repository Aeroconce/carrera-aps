#!/bin/sh
# Worker de la demo (docs 04 §6, 07 y 17): sincroniza las alertas a las 02:00 y respalda la base a las 03:00
# (hora de America/Santiago, TZ del contenedor). Sin dependencias: un bucle que revisa la hora cada minuto.
# Al arrancar hace una sincronización inicial para que la demo nunca muestre alertas desactualizadas.

set -eu
cd /app
echo "worker: arranque $(date)"
# Latido para el healthcheck de Compose (la imagen no trae procps): se renueva en cada vuelta del bucle
LATIDO=/tmp/worker-latido
touch "$LATIDO"
pnpm alertas:sincronizar || echo "worker: sincronización inicial falló"

ultimo_alertas=""
ultimo_respaldo=""
while true; do
  ahora=$(date +%H:%M)
  hoy=$(date +%F)
  if [ "$ahora" = "02:00" ] && [ "$ultimo_alertas" != "$hoy" ]; then
    ultimo_alertas="$hoy"
    pnpm alertas:sincronizar || echo "worker: sincronización de alertas falló"
  fi
  if [ "$ahora" = "03:00" ] && [ "$ultimo_respaldo" != "$hoy" ]; then
    ultimo_respaldo="$hoy"
    pnpm respaldo || echo "worker: respaldo falló"
    # Retención local: 30 días
    find /data/respaldos -type f -mtime +30 -delete 2>/dev/null || true
  fi
  touch "$LATIDO"
  sleep 60
done
