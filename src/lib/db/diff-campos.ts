// Diferencia entre dos versiones de un registro: solo los campos que cambiaron, con valor anterior y nuevo.
// Es lo que se guarda en Auditoria.antes y Auditoria.despues (doc 07): una bitácora legible y compacta.
//
// Reglas:
// - Ignora campos técnicos (updatedAt) y los que se indiquen en `ignorar`.
// - Compara Date por instante, Decimal por valor (usa su toJSON), BigInt por texto, objetos y arreglos por
//   contenido con claves ordenadas. `undefined` y `null` se consideran el mismo "sin valor".
// - Ambas versiones deben tener la misma forma (idealmente leídas de la base antes y después de escribir),
//   así los tipos coinciden y no aparecen cambios falsos.

export type Registro = Record<string, unknown>;

export interface DiferenciaCampos {
  antes: Registro;
  despues: Registro;
}

const CAMPOS_IGNORADOS: ReadonlySet<string> = new Set(["updatedAt"]);

/** Convierte un valor a algo serializable como Json de Prisma: Date → ISO 8601, BigInt → texto, Decimal → texto. */
export function aJson(valor: unknown): unknown {
  if (valor === undefined || valor === null) return null;
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "bigint") return valor.toString();
  if (Array.isArray(valor)) return valor.map(aJson);
  if (typeof valor === "object") {
    const objeto = valor as Record<string, unknown> & { toJSON?: () => unknown };
    if (typeof objeto.toJSON === "function") return aJson(objeto.toJSON());
    const salida: Record<string, unknown> = {};
    for (const clave of Object.keys(objeto).sort()) {
      salida[clave] = aJson(objeto[clave]);
    }
    return salida;
  }
  return valor;
}

function iguales(a: unknown, b: unknown): boolean {
  return JSON.stringify(aJson(a)) === JSON.stringify(aJson(b));
}

/** Campos que cambian entre `anterior` y `nuevo`. Para una creación, `anterior` puede ser null. */
export function diffCampos(
  anterior: Registro | null | undefined,
  nuevo: Registro | null | undefined,
  opciones: { ignorar?: Iterable<string> } = {},
): DiferenciaCampos {
  const ignorados = new Set<string>([...CAMPOS_IGNORADOS, ...(opciones.ignorar ?? [])]);
  const antes: Registro = {};
  const despues: Registro = {};
  const claves = new Set<string>([...Object.keys(anterior ?? {}), ...Object.keys(nuevo ?? {})]);

  for (const clave of claves) {
    if (ignorados.has(clave)) continue;
    const valorAnterior = anterior?.[clave];
    const valorNuevo = nuevo?.[clave];
    if (iguales(valorAnterior, valorNuevo)) continue;
    antes[clave] = aJson(valorAnterior);
    despues[clave] = aJson(valorNuevo);
  }

  return { antes, despues };
}

export function hayCambios(diferencia: DiferenciaCampos): boolean {
  return Object.keys(diferencia.despues).length > 0;
}
