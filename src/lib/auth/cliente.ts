// Cliente de Better Auth para componentes cliente (login, cambio de contraseña, cierre de sesión).
//
// Habla con /api/auth/* (el route handler), así el límite de intentos y el registro de accesos se aplican
// igual que a cualquier petición HTTP. Es la única excepción a "sin fetch a rutas propias desde el cliente"
// (doc 15): esas rutas son la API de la librería de autenticación, no rutas del dominio.
//
// inferAdditionalFields tipa los campos propios del usuario (institucionId, funcionarioId,
// debeCambiarPassword); adminClient expone las rutas del plugin admin para la gestión de usuarios.

import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), adminClient()],
});
