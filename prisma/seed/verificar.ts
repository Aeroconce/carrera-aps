// Verificación rápida del seed: estado de carrera de los casos, calculado desde la base (uso interno).
import "dotenv/config";
import { prisma } from "../../src/lib/db/prisma";
import { carreraDeFuncionario } from "../../src/lib/carrera/funcionario";
import { generarAlertas } from "../../src/lib/motor/alertas";

const funcionarios = await prisma.funcionario.findMany({ orderBy: { apellidos: "asc" } });
for (const f of funcionarios) {
  const c = await carreraDeFuncionario(f.id, "2026-09-25");
  if (!c) continue;
  const e = c.estado;
  console.log(`${f.nombres} ${f.apellidos}: total ${e.puntaje.total} (exp ${e.puntaje.experiencia}, cap ${e.puntaje.capacitacion}, est ${e.puntaje.estudios}, otros ${e.puntaje.otrosApertura}) · nivel ${e.nivel.vigente}/${e.nivel.calculado} · faltan ${e.nivel.puntajeFaltante} · próximo bienio ${e.bienios.proximoBienio} · estimado ${e.proyeccion?.fechaEstimada} · alertas ${generarAlertas(e, c.reglas).map((a) => a.tipo).join(",") || "ninguna"}`);
}
const cap = await prisma.capacitacion.findMany({ orderBy: [{ funcionarioId: "asc" }, { fechaTermino: "asc" }], select: { periodo: true, nombre: true, puntajeCalculado: true, puntajeAplicado: true } });
console.log("capacitaciones (calculado/aplicado):", cap.map((c) => `${c.periodo} ${c.nombre}: ${c.puntajeCalculado}/${c.puntajeAplicado}`).join(" | "));
console.log("excedentes:", (await prisma.excedenteCapacitacion.findMany()).map((e) => `${e.periodoOrigen}→${e.periodoDestino}: ${e.puntaje}${e.caducadoEl ? " caducado" : ""}`).join(" | "));
console.log("auditoría:", await prisma.auditoria.groupBy({ by: ["accion"], _count: true }).then((g) => g.map((x) => `${x.accion}=${x._count}`).join(", ")));
await prisma.$disconnect();
