import * as React from "react";
import { cn } from "cn";

// Entrada nativa con el mismo estilo que Input (shadcn/Base UI). Para type="date" y type="number" en formularios
// renderizados en el servidor: el Input de Base UI añade en el cliente un estilo (caret transparente) que no
// existe en el HTML del servidor y provoca un aviso de hidratación en cada carga.
function EntradaNativa({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { EntradaNativa };
