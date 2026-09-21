// Genera en .env las contraseñas de las cuentas de demostración que falten (doc 08, doc 17): valores aleatorios
// de 16+ caracteres que nunca se imprimen. Luego `pnpm seed:demo` crea o actualiza las cuentas con ellas.
// Uso: pnpm exec tsx scripts/generar-contrasenas-demo.ts

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const VARIABLES = ["SEED_ADMIN_PASSWORD", "SEED_SUPERVISION_PASSWORD", "SEED_FUNCIONARIO_PASSWORD"];
const ruta = ".env";
const actual = existsSync(ruta) ? readFileSync(ruta, "utf8") : "";
const lineas = actual.split(/\r?\n/);
const definidas = new Set(lineas.map((l) => l.split("=")[0]?.trim()).filter((k) => k && !k.startsWith("#")));
const nuevas: string[] = [];

for (const variable of VARIABLES) {
  const linea = lineas.find((l) => l.startsWith(`${variable}=`));
  const valor = linea?.slice(variable.length + 1).trim() ?? "";
  if (definidas.has(variable) && valor) continue;
  const contrasena = randomBytes(18).toString("base64url").slice(0, 20);
  if (linea !== undefined) {
    lineas[lineas.indexOf(linea)] = `${variable}=${contrasena}`;
  } else {
    nuevas.push(`${variable}=${contrasena}`);
  }
  process.stdout.write(`${variable}: generada\n`);
}

const salida = [...lineas.filter((l, i) => !(i === lineas.length - 1 && l === "")), ...nuevas].join("\n") + "\n";
writeFileSync(ruta, salida, "utf8");
process.stdout.write("Listo. Las contraseñas quedaron en .env (no se muestran).\n");
