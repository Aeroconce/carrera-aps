#!/usr/bin/env bash
# Monitor de salud de la demo en VPS2 (doc 17): cada 5 minutos consulta /api/health por HTTPS; si falla dos veces
# seguidas, reinicia `web` (y `worker`) con Compose y deja constancia en el registro. No avisa por correo: para
# un aviso externo, apuntar un servicio de monitoreo (UptimeRobot u otro) a la misma URL.
# Instalar (como root):
#   install -m 755 /srv/carrera-aps/deploy/salud-demo.sh /usr/local/bin/salud-demo
#   echo '*/5 * * * * root /usr/local/bin/salud-demo' > /etc/cron.d/carrera-demo-salud
# Registro: /var/log/carrera-demo-salud.log

set -u
URL="${URL:-https://demo-carrera.aeroconce.cl/api/health}"
REGISTRO=/var/log/carrera-demo-salud.log
FALLOS=/run/carrera-demo-salud.fallos
DC="docker compose -p carrera-demo --profile demo"

respuesta=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "$URL" 2>/dev/null || echo 000)
if [ "$respuesta" = "200" ]; then
  if [ -s "$FALLOS" ]; then echo "$(date '+%F %T') recuperado (HTTP 200)" >> "$REGISTRO"; fi
  : > "$FALLOS"
  exit 0
fi

fallos=$(( $(cat "$FALLOS" 2>/dev/null || echo 0) + 1 ))
echo "$fallos" > "$FALLOS"
echo "$(date '+%F %T') fallo $fallos: HTTP $respuesta en $URL" >> "$REGISTRO"
if [ "$fallos" -ge 2 ]; then
  echo "$(date '+%F %T') reiniciando web y worker" >> "$REGISTRO"
  (cd /srv/carrera-aps && $DC restart web worker) >> "$REGISTRO" 2>&1
  : > "$FALLOS"
fi
