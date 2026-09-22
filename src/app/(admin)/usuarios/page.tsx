import type { Metadata } from "next";
import Link from "next/link";
import { DialogoFormulario } from "@/components/dominio/dialogo-formulario";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { actualizarUsuarioAction } from "@/lib/acciones/usuarios";
import { exigirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { ultimosAccesos } from "@/lib/db/usuarios";
import { formatearFechaHora, formatearRut, nombreCompleto } from "@/lib/formato";
import { BotonEstadoUsuario, NuevoUsuario, RestablecerContrasena } from "./acciones";
import { textosUsuarios as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

// Módulo Usuarios y accesos (doc 05 §16, doc 07): cuentas por rol, vínculo con el funcionario, contraseñas, estado.
export default async function UsuariosPage() {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const [usuarios, funcionarios] = await Promise.all([
    prisma.user.findMany({ where: { institucionId }, include: { funcionario: { select: { id: true, nombres: true, apellidos: true, rut: true } } }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.funcionario.findMany({ where: { institucionId, estado: "ACTIVO" }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], select: { id: true, nombres: true, apellidos: true, rut: true } }),
  ]);
  const accesos = await ultimosAccesos(usuarios.map((u) => u.id));
  const opcionesFuncionario = funcionarios.map((f) => ({ id: f.id, etiqueta: `${f.apellidos}, ${f.nombres} · ${formatearRut(f.rut)}` }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/auditoria/accesos" className={buttonVariants({ variant: "outline" })}>{t.accesos}</Link>
          <NuevoUsuario funcionarios={opcionesFuncionario} />
        </div>
      </div>

      {usuarios.length === 0 ? (
        <p className="rounded-lg border border-dashed border-linea p-8 text-center text-sm text-tinta-secundaria">{t.vacio}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columnas.nombre}</TableHead>
                <TableHead>{t.columnas.correo}</TableHead>
                <TableHead>{t.columnas.rol}</TableHead>
                <TableHead>{t.columnas.funcionario}</TableHead>
                <TableHead>{t.columnas.estado}</TableHead>
                <TableHead>{t.columnas.ultimoAcceso}</TableHead>
                <TableHead>{t.columnas.acciones}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => {
                const activo = !u.banned;
                const ultimo = accesos.get(u.id);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}{u.id === sesion.user.id ? " (tú)" : ""}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant="secondary">{t.roles[u.role ?? ""] ?? u.role}</Badge></TableCell>
                    <TableCell>
                      {u.funcionario ? (
                        <Link href={`/funcionarios/${u.funcionario.id}`} className="text-institucional hover:underline">{nombreCompleto(u.funcionario)}</Link>
                      ) : (
                        ""
                      )}
                    </TableCell>
                    <TableCell>
                      {activo ? <Badge className="bg-correcto text-white">{t.activo}</Badge> : <Badge className="bg-error text-white">{t.desactivado}</Badge>}
                      {u.debeCambiarPassword && <span className="mt-1 block text-xs text-tinta-secundaria">{t.pendienteCambio}</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{ultimo ? formatearFechaHora(ultimo) : <span className="text-tinta-secundaria">{t.nunca}</span>}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <DialogoFormulario
                          titulo={t.dialogoEditar.titulo}
                          textoBoton={t.editar}
                          varianteBoton="outline"
                          tamanoBoton="xs"
                          campos={[
                            { nombre: "name", etiqueta: t.dialogoEditar.nombre, tipo: "text", requerido: true, ancho: "completo", valorInicial: u.name },
                            { nombre: "role", etiqueta: t.dialogoEditar.rol, tipo: "select", requerido: true, valorInicial: u.role ?? "FUNCIONARIO", opciones: Object.entries(t.roles).map(([valor, etiqueta]) => ({ valor, etiqueta })) },
                            { nombre: "funcionarioId", etiqueta: t.dialogoEditar.funcionario, tipo: "select", valorInicial: u.funcionarioId ?? "", opciones: [{ valor: "", etiqueta: t.dialogoEditar.sinFuncionario }, ...opcionesFuncionario.map((f) => ({ valor: f.id, etiqueta: f.etiqueta }))] },
                          ]}
                          accion={actualizarUsuarioAction.bind(null, u.id)}
                          textoEnviar={t.dialogoEditar.enviar}
                          exito={t.dialogoEditar.exito}
                        />
                        <RestablecerContrasena id={u.id} email={u.email} />
                        {u.id !== sesion.user.id && <BotonEstadoUsuario id={u.id} activo={activo} />}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
