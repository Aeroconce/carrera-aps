// RUT chileno (doc 10): implementación propia del módulo 11, sin dependencias.
// Se guarda limpio (sin puntos ni guion, dígito verificador en mayúscula) y se formatea al mostrar.

/** Deja solo dígitos y K, en mayúscula: "12.345.678-k" → "12345678K". */
export function limpiarRut(valor: string): string {
  return valor.replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Dígito verificador (módulo 11) del número sin verificador. */
export function digitoVerificador(numero: number | string): string {
  const digitos = String(numero).replace(/\D/g, "");
  let suma = 0;
  let factor = 2;
  for (let i = digitos.length - 1; i >= 0; i--) {
    suma += Number(digitos[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

/** true si el RUT (con o sin formato) tiene número de al menos 6 dígitos y dígito verificador correcto. */
export function validarRut(valor: string): boolean {
  const limpio = limpiarRut(valor);
  if (limpio.length < 7) return false;
  const numero = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(numero)) return false;
  return digitoVerificador(numero) === dv;
}

/** "12345678K" → "12.345.678-K". Acepta valores con o sin formato. */
export function formatearRut(valor: string): string {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return limpio;
  const numero = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const conPuntos = numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${conPuntos}-${dv}`;
}

/** RUT completo y limpio a partir del número, con su dígito verificador (para el seed). */
export function generarRutConDv(numero: number): string {
  return `${numero}${digitoVerificador(numero)}`;
}
