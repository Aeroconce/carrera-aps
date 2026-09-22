// Documentos ficticios de la demo (doc 08): certificados PDF mínimos para 40 funcionarios, vinculados a una
// capacitación sin respaldo, y un documento institucional. Usa la misma capa que la aplicación.

import type { ContextoAuditoria } from "../../src/lib/db/auditado";
import { crearDocumento, vincularDocumento } from "../../src/lib/db/documentos";
import { prisma } from "../../src/lib/db/prisma";
import { guardarArchivo, pdfMinimo } from "../../src/lib/documentos/almacenamiento";

export async function sembrarDocumentos(ctx: ContextoAuditoria, institucionId: string): Promise<void> {
  if ((await prisma.documento.count({ where: { institucionId } })) > 0) {
    console.log("Documentos: ya existen, se omite");
    return;
  }
  const capacitaciones = await prisma.capacitacion.findMany({
    where: { documentoId: null, funcionario: { institucionId, estado: "ACTIVO" } },
    include: { funcionario: { select: { id: true, nombres: true, apellidos: true } } },
    orderBy: { fechaTermino: "desc" },
  });
  let n = 0;
  for (const c of capacitaciones) {
    const texto = `Certificado de demostracion: ${c.nombre} - ${c.funcionario.nombres} ${c.funcionario.apellidos} (${c.horas} horas)`;
    const guardado = await guardarArchivo(institucionId, pdfMinimo(texto));
    const documento = await crearDocumento(ctx, {
      institucionId,
      funcionarioId: c.funcionario.id,
      tipo: "CERTIFICADO_CAPACITACION",
      nombre: `Certificado ${c.nombre}.pdf`,
      ruta: guardado.ruta,
      mime: guardado.mime,
      tamano: guardado.tamano,
      hash: guardado.hash,
    });
    await vincularDocumento(ctx, "capacitacion", c.id, documento.id, c.funcionario.id);
    n++;
  }
  const bienios = await prisma.bienio.findMany({
    where: { documentoId: null, fechaReconocido: { not: null }, funcionario: { institucionId } },
    include: { funcionario: { select: { id: true, nombres: true, apellidos: true } } },
    orderBy: { fechaReconocido: "desc" },
    take: 190,
  });
  let d = 0;
  for (const b of bienios) {
    const guardado = await guardarArchivo(institucionId, pdfMinimo(`Decreto ${b.decretoNumero ?? ""} de reconocimiento del bienio ${b.numero} - ${b.funcionario.nombres} ${b.funcionario.apellidos} (documento de demostracion)`));
    const documento = await crearDocumento(ctx, { institucionId, funcionarioId: b.funcionario.id, tipo: "DECRETO", nombre: `Decreto ${b.decretoNumero ?? b.numero} bienio ${b.numero}.pdf`, ruta: guardado.ruta, mime: guardado.mime, tamano: guardado.tamano, hash: guardado.hash });
    await vincularDocumento(ctx, "bienio", b.id, documento.id, b.funcionario.id);
    d++;
  }
  const reglamento = await guardarArchivo(institucionId, pdfMinimo("Reglamento comunal de carrera funcionaria (documento de demostracion)"));
  await crearDocumento(ctx, { institucionId, funcionarioId: null, tipo: "OTRO", nombre: "Reglamento comunal de carrera funcionaria (demo).pdf", ruta: reglamento.ruta, mime: reglamento.mime, tamano: reglamento.tamano, hash: reglamento.hash });
  console.log(`Documentos: ${n} certificados, ${d} decretos vinculados y 1 institucional`);
}
