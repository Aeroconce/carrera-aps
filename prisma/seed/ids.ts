// Imprime los ids de los casos de la demo para pruebas manuales y capturas.
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";

const filas = await prisma.funcionario.findMany({ select: { id: true, nombres: true, apellidos: true }, orderBy: { apellidos: "asc" } });
for (const f of filas) process.stdout.write(`${f.id}\t${f.nombres} ${f.apellidos}\n`);
await prisma.$disconnect();
