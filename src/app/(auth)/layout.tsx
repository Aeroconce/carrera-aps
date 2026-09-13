import type { ReactNode } from "react";
import { textosAuth } from "./textos";

// Pantallas de acceso (login, cambio de contraseña, sin permiso): una columna centrada sobre el fondo,
// sin navegación. La tarjeta la pone cada página.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <header className="mb-6 text-center">
        <p className="text-xl font-semibold text-institucional">{textosAuth.producto}</p>
        <p className="text-sm text-tinta-secundaria">{textosAuth.descripcion}</p>
      </header>
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
