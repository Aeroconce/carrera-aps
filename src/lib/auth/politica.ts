// Política de sesión y de acceso (doc 07), centralizada para revisarla en un solo lugar.
// Vive aparte de auth.ts para que los componentes cliente puedan importarla sin arrastrar el servidor.

export const POLITICA_ACCESO = {
  largoMinimoPassword: 10,
  largoMaximoPassword: 128,
  /** Vida de la sesión desde su última renovación (expiración por inactividad). */
  sesionSegundos: 30 * 60,
  /** Cada cuánto se renueva la sesión con actividad. */
  renovacionSesionSegundos: 5 * 60,
  intentosLoginMax: 5,
  intentosLoginVentanaSegundos: 15 * 60,
} as const;
