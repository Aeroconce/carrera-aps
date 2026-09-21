"use client";

// Estructura del área administrativa (doc 12): barra lateral con los módulos en el orden de las bases,
// colapsable a íconos en tablet y Sheet lateral en celular (lo resuelve el componente Sidebar de shadcn),
// cabecera con el título de la sección y pie con la nota de demostración cuando corresponde.

import {
  BellIcon,
  BookOpenIcon,
  ClipboardCheckIcon,
  DatabaseBackupIcon,
  FileTextIcon,
  FolderIcon,
  GraduationCapIcon,
  HomeIcon,
  ScrollTextIcon,
  SettingsIcon,
  TrendingUpIcon,
  UploadIcon,
  UsersIcon,
  UserCogIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { textosShell } from "@/app/(admin)/textos";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/cliente";
import type { Rol } from "@/lib/auth/politica";

const ICONOS: Record<string, LucideIcon> = {
  inicio: HomeIcon,
  funcionarios: UsersIcon,
  carrera: TrendingUpIcon,
  capacitaciones: GraduationCapIcon,
  calificaciones: ClipboardCheckIcon,
  reportes: FileTextIcon,
  alertas: BellIcon,
  documentos: FolderIcon,
  parametros: SettingsIcon,
  auditoria: ScrollTextIcon,
  respaldos: DatabaseBackupIcon,
  importar: UploadIcon,
  exportacion: BookOpenIcon,
  usuarios: UserCogIcon,
};

interface Props {
  usuario: { nombre: string; rol: Rol };
  modoDemo: boolean;
  /** Alertas activas de la institución, para el contador del menú (doc 13 F7) */
  alertasActivas?: number;
  children: ReactNode;
}

function esActiva(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function ShellAdmin({ usuario, modoDemo, alertasActivas = 0, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [saliendo, iniciarSalida] = useTransition();
  const permitida = (href: string) => usuario.rol === "ADMIN" || (textosShell.rutasSupervision as readonly string[]).includes(href);

  const grupo = (titulo: string | null, items: ReadonlyArray<{ href: string; etiqueta: string; icono: string }>) => {
    const visibles = items.filter((i) => permitida(i.href));
    if (visibles.length === 0) return null;
    return (
      <SidebarGroup>
        {titulo && <SidebarGroupLabel>{titulo}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {visibles.map((item) => {
              const Icono = ICONOS[item.icono] ?? HomeIcon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton isActive={esActiva(pathname, item.href)} tooltip={item.etiqueta} render={<Link href={item.href} />}>
                    <Icono />
                    <span>{item.etiqueta}</span>
                    {item.href === "/alertas" && alertasActivas > 0 && (
                      <span className="ml-auto rounded-full bg-institucional px-1.5 text-[0.6875rem] font-medium text-white group-data-[collapsible=icon]:hidden" aria-label={`${alertasActivas} alertas activas`}>
                        {alertasActivas}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-3">
          <Link href="/" className="text-base font-semibold text-institucional group-data-[collapsible=icon]:hidden">
            {textosShell.producto}
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {grupo(null, textosShell.menu.principal)}
          {grupo("Administración", textosShell.menu.administracion)}
        </SidebarContent>
        <SidebarFooter className="gap-1 px-3 py-3 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-xs font-medium">{usuario.nombre}</p>
          <p className="text-xs text-tinta-secundaria">{textosShell.roles[usuario.rol]}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            disabled={saliendo}
            onClick={() =>
              iniciarSalida(async () => {
                await authClient.signOut();
                router.replace("/login");
                router.refresh();
              })
            }
          >
            {textosShell.cerrarSesion}
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex h-12 items-center gap-2 border-b border-linea bg-superficie px-3 md:px-4">
          <SidebarTrigger aria-label={textosShell.abrirMenu} />
          <span className="text-sm font-medium text-institucional md:hidden">{textosShell.producto}</span>
        </header>
        <div className="mx-auto w-full max-w-contenido flex-1 px-4 py-5 md:px-6 md:py-6">{children}</div>
        {modoDemo && (
          <footer className="border-t border-linea px-4 py-2 text-center text-xs text-tinta-secundaria">{textosShell.notaDemo}</footer>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
