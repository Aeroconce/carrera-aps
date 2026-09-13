// Endpoints de Better Auth (/api/auth/*): inicio y cierre de sesión, sesión actual, cambio de contraseña y
// las rutas del plugin admin. Toda la lógica vive en src/lib/auth/auth.ts; aquí solo se adapta a Next.js.

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/auth";

export const { GET, POST } = toNextJsHandler(auth);
