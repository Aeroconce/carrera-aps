// Chequeo optimista de sesión antes de cada página (Next 16: proxy.ts, antes middleware.ts).
//
// Solo mira si existe la cookie de sesión, sin consultar la base: redirige a /login cuando falta y aleja de
// /login cuando ya existe. No es la autorización real: cada página y cada server action vuelve a verificar
// la sesión contra la base con exigirSesion (src/lib/auth/sesion.ts), como recomienda la guía de Next.

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PUBLICAS = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const haySesion = Boolean(getSessionCookie(request, { cookiePrefix: "carrera-aps" }));

  if (!haySesion && !RUTAS_PUBLICAS.has(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (haySesion && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Todo salvo la API, los recursos estáticos y el favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
