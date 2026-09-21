// Worker de alertas (doc 04 §6, doc 17): sincroniza las alertas de cada institución con el cálculo del motor.
// Se ejecuta cada noche desde cron o el servicio `worker` de Compose: `pnpm alertas:sincronizar`.
// La auditoría queda a nombre del primer usuario ADMIN de la institución.

import "dotenv/config";
import { sincronizarAlertas } from "../src/lib/db/alertas";
import { prisma } from "../src/lib/db/prisma";

const instituciones = await prisma.institucion.findMany({ select: { id: true, nombre: true } });
for (const institucion of instituciones) {
  const admin = await prisma.user.findFirst({ where: { institucionId: institucion.id, role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!admin) {
    process.stdout.write(`${institucion.nombre}: sin usuario ADMIN, se omite\n`);
    continue;
  }
  const r = await sincronizarAlertas({ usuarioId: admin.id }, institucion.id);
  process.stdout.write(`${institucion.nombre}: ${r.nuevas} nuevas, ${r.actualizadas} actualizadas, ${r.resueltas} resueltas, ${r.activas} activas\n`);
}
await prisma.$disconnect();
