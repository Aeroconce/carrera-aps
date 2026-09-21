// Respaldo diario de la base (doc 07, doc 17): lo ejecuta cron o el servicio `backup` de Compose.
// Uso: pnpm respaldo. Deja el archivo en RESPALDOS_DIR y la evidencia en la tabla Respaldo.

import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { ejecutarRespaldoBd } from "../src/lib/respaldos/ejecutar";

const r = await ejecutarRespaldoBd();
process.stdout.write(`${r.respaldo.resultado}: ${r.respaldo.destino} (${r.respaldo.tamano} bytes, ${r.respaldo.duracionSeg} s${r.cifrado ? ", cifrado" : ""}${r.origen ? `, ${r.origen}` : ""})\n`);
await prisma.$disconnect();
process.exit(r.respaldo.resultado === "OK" ? 0 : 1);
