// Diálogos de acción de la ficha (doc 13 F3, F4 y F5; doc 05 módulo 2). Componentes de servidor que
// arman cada diálogo con sus campos y la server action ya ligada al funcionario.

import { DialogoFormulario, type CampoFormulario } from "@/components/dominio/dialogo-formulario";
import {
  actualizarFuncionarioAction,
  darDeBajaAction,
  reconocerBienioAction,
  registrarCambioNivelAction,
  registrarCapacitacionAction,
  registrarEstudioAction,
  registrarExperienciaAction,
} from "@/lib/acciones/funcionarios";
import type { CarreraDeFuncionario } from "@/lib/carrera/funcionario";
import { formatearChileno, hoyEnChile } from "@/lib/fechas/civil";
import { formatearFecha, formatearPuntos } from "@/lib/formato";
import type { BienioCalculado } from "@/lib/motor/bienios";
import { textosAcciones as t } from "./textos-acciones";

const CATEGORIAS = ["A", "B", "C", "D", "E", "F"].map((c) => ({ valor: c, etiqueta: c }));
const CONTRATOS = [
  { valor: "TITULAR", etiqueta: "Titular" },
  { valor: "PLAZO_FIJO", etiqueta: "Plazo fijo" },
  { valor: "REEMPLAZO", etiqueta: "Reemplazo" },
];

export function DialogoCapacitacion({ carrera }: { carrera: CarreraDeFuncionario }) {
  const f = carrera.funcionario;
  const campos: CampoFormulario[] = [
    { nombre: "nombre", etiqueta: t.capacitacion.nombre, tipo: "text", requerido: true, ancho: "completo" },
    { nombre: "institucionDicta", etiqueta: t.capacitacion.institucion, tipo: "text", requerido: true },
    { nombre: "tipo", etiqueta: t.capacitacion.tipo, tipo: "select", requerido: true, valorInicial: "CURSO", opciones: t.capacitacion.tipos },
    { nombre: "horas", etiqueta: t.capacitacion.horas, tipo: "number", requerido: true, min: 1 },
    { nombre: "notaOEvaluacion", etiqueta: t.capacitacion.nota, tipo: "text", ayuda: t.capacitacion.notaAyuda },
    { nombre: "fechaInicio", etiqueta: t.capacitacion.inicio, tipo: "fecha", requerido: true },
    { nombre: "fechaTermino", etiqueta: t.capacitacion.termino, tipo: "fecha", requerido: true },
    { nombre: "periodo", etiqueta: t.capacitacion.periodo, tipo: "number", ayuda: t.capacitacion.periodoAyuda, min: 2000, max: 2100 },
    { nombre: "aprobado", etiqueta: t.capacitacion.aprobada, tipo: "checkbox", valorInicial: true },
    { nombre: "esOtraComuna", etiqueta: t.capacitacion.otraComuna, tipo: "checkbox", valorInicial: false },
  ];
  return (
    <DialogoFormulario
      titulo={t.capacitacion.titulo}
      descripcion={t.capacitacion.descripcion(f.nombres)}
      textoBoton={t.capacitacion.boton}
      campos={campos}
      accion={registrarCapacitacionAction.bind(null, f.id)}
      textoEnviar={t.capacitacion.enviar}
      exito={t.capacitacion.exito}
    />
  );
}

export function DialogoReconocerBienio({ carrera, bienio }: { carrera: CarreraDeFuncionario; bienio: BienioCalculado }) {
  const f = carrera.funcionario;
  const campos: CampoFormulario[] = [
    { nombre: "numero", tipo: "hidden", valorInicial: bienio.numero },
    { nombre: "decretoNumero", etiqueta: t.bienio.decretoNumero, tipo: "text", requerido: true },
    { nombre: "decretoFecha", etiqueta: t.bienio.decretoFecha, tipo: "fecha", requerido: true, valorInicial: formatearChileno(hoyEnChile()) },
  ];
  return (
    <DialogoFormulario
      titulo={t.bienio.titulo(bienio.numero)}
      descripcion={t.bienio.descripcion(formatearFecha(bienio.fechaCumplido), formatearPuntos(bienio.puntaje))}
      textoBoton={t.bienio.boton}
      varianteBoton="outline"
      tamanoBoton="xs"
      campos={campos}
      accion={reconocerBienioAction.bind(null, f.id)}
      textoEnviar={t.bienio.enviar}
      exito={t.bienio.exito}
    />
  );
}

export function DialogoCambioNivel({ carrera }: { carrera: CarreraDeFuncionario }) {
  const { funcionario: f, estado } = carrera;
  const propuesto = estado.nivel.cumpleAscenso ? estado.nivel.calculado : (estado.nivel.siguiente?.nivel ?? estado.nivel.calculado);
  const campos: CampoFormulario[] = [
    { nombre: "nivel", etiqueta: t.nivel.nivel, tipo: "number", requerido: true, valorInicial: propuesto, min: 1, max: 99, ayuda: t.nivel.nivelAyuda(estado.nivel.calculado) },
    { nombre: "fechaDesde", etiqueta: t.nivel.desde, tipo: "fecha", requerido: true, valorInicial: formatearChileno(hoyEnChile()) },
    { nombre: "decretoNumero", etiqueta: t.nivel.decretoNumero, tipo: "text", requerido: true },
    { nombre: "decretoFecha", etiqueta: t.nivel.decretoFecha, tipo: "fecha", requerido: true, valorInicial: formatearChileno(hoyEnChile()) },
    { nombre: "motivo", etiqueta: t.nivel.motivo, tipo: "select", requerido: true, valorInicial: "ASCENSO", opciones: t.nivel.motivos },
  ];
  return (
    <DialogoFormulario
      titulo={t.nivel.titulo}
      descripcion={t.nivel.descripcion(estado.nivel.vigente ?? estado.nivel.calculado, estado.nivel.calculado)}
      textoBoton={t.nivel.boton}
      campos={campos}
      accion={registrarCambioNivelAction.bind(null, f.id)}
      textoEnviar={t.nivel.enviar}
      exito={t.nivel.exito}
    />
  );
}

export function DialogoEstudio({ carrera }: { carrera: CarreraDeFuncionario }) {
  const f = carrera.funcionario;
  const campos: CampoFormulario[] = [
    { nombre: "tipo", etiqueta: t.estudio.tipo, tipo: "select", requerido: true, valorInicial: "DIPLOMADO", opciones: t.estudio.tipos },
    { nombre: "nombre", etiqueta: t.estudio.nombre, tipo: "text", requerido: true },
    { nombre: "institucion", etiqueta: t.estudio.institucion, tipo: "text", requerido: true },
    { nombre: "fechaObtencion", etiqueta: t.estudio.obtencion, tipo: "fecha", requerido: true },
    { nombre: "reconocidoEl", etiqueta: t.estudio.reconocido, tipo: "fecha", ayuda: t.estudio.reconocidoAyuda },
  ];
  return (
    <DialogoFormulario
      titulo={t.estudio.titulo}
      textoBoton={t.estudio.boton}
      campos={campos}
      accion={registrarEstudioAction.bind(null, f.id)}
      textoEnviar={t.estudio.enviar}
      exito={t.estudio.exito}
    />
  );
}

export function DialogoExperiencia({ carrera }: { carrera: CarreraDeFuncionario }) {
  const f = carrera.funcionario;
  const campos: CampoFormulario[] = [
    { nombre: "institucion", etiqueta: t.experiencia.institucion, tipo: "text", requerido: true, ancho: "completo" },
    { nombre: "fechaDesde", etiqueta: t.experiencia.desde, tipo: "fecha", requerido: true },
    { nombre: "fechaHasta", etiqueta: t.experiencia.hasta, tipo: "fecha", ayuda: t.experiencia.hastaAyuda },
    { nombre: "jornadaHoras", etiqueta: t.experiencia.jornada, tipo: "number", min: 1, max: 44 },
    { nombre: "reconocidaEl", etiqueta: t.experiencia.reconocida, tipo: "fecha", ayuda: t.experiencia.reconocidaAyuda },
    { nombre: "esPropia", etiqueta: t.experiencia.propia, tipo: "checkbox", valorInicial: false },
  ];
  return (
    <DialogoFormulario
      titulo={t.experiencia.titulo}
      descripcion={t.experiencia.descripcion}
      textoBoton={t.experiencia.boton}
      varianteBoton="outline"
      campos={campos}
      accion={registrarExperienciaAction.bind(null, f.id)}
      textoEnviar={t.experiencia.enviar}
      exito={t.experiencia.exito}
    />
  );
}

export function DialogoEditarDatos({ carrera, establecimientos }: { carrera: CarreraDeFuncionario; establecimientos: Array<{ id: string; nombre: string }> }) {
  const f = carrera.funcionario;
  const campos: CampoFormulario[] = [
    { nombre: "rut", etiqueta: t.datos.rut, tipo: "text", requerido: true, valorInicial: f.rut },
    { nombre: "email", etiqueta: t.datos.email, tipo: "email", valorInicial: f.email },
    { nombre: "nombres", etiqueta: t.datos.nombres, tipo: "text", requerido: true, valorInicial: f.nombres },
    { nombre: "apellidos", etiqueta: t.datos.apellidos, tipo: "text", requerido: true, valorInicial: f.apellidos },
    { nombre: "fechaNacimiento", etiqueta: t.datos.fechaNacimiento, tipo: "fecha", valorInicial: formatearFecha(f.fechaNacimiento) },
    { nombre: "categoria", etiqueta: t.datos.categoria, tipo: "select", requerido: true, valorInicial: f.categoria, opciones: CATEGORIAS },
    { nombre: "tipoContrato", etiqueta: t.datos.tipoContrato, tipo: "select", requerido: true, valorInicial: f.tipoContrato, opciones: CONTRATOS },
    { nombre: "fechaIngreso", etiqueta: t.datos.fechaIngreso, tipo: "fecha", requerido: true, valorInicial: formatearFecha(f.fechaIngreso) },
    { nombre: "establecimientoId", etiqueta: t.datos.establecimiento, tipo: "select", requerido: true, valorInicial: f.establecimientoId, opciones: establecimientos.map((e) => ({ valor: e.id, etiqueta: e.nombre })) },
    { nombre: "cargo", etiqueta: t.datos.cargo, tipo: "text", valorInicial: f.cargo },
    { nombre: "jornadaHoras", etiqueta: t.datos.jornada, tipo: "number", valorInicial: f.jornadaHoras, min: 1, max: 44 },
  ];
  return (
    <DialogoFormulario
      titulo={t.datos.titulo}
      textoBoton={t.datos.boton}
      varianteBoton="outline"
      campos={campos}
      accion={actualizarFuncionarioAction.bind(null, f.id)}
      textoEnviar={t.datos.enviar}
      exito={t.datos.exito}
    />
  );
}

export function DialogoBaja({ carrera }: { carrera: CarreraDeFuncionario }) {
  const f = carrera.funcionario;
  const campos: CampoFormulario[] = [
    { nombre: "fechaEgreso", etiqueta: t.baja.fechaEgreso, tipo: "fecha", requerido: true, valorInicial: formatearChileno(hoyEnChile()) },
    { nombre: "motivoEgreso", etiqueta: t.baja.motivo, tipo: "textarea", requerido: true },
  ];
  return (
    <DialogoFormulario
      titulo={t.baja.titulo}
      descripcion={t.baja.descripcion}
      textoBoton={t.baja.boton}
      varianteBoton="destructive"
      campos={campos}
      accion={darDeBajaAction.bind(null, f.id)}
      textoEnviar={t.baja.enviar}
      exito={t.baja.exito}
    />
  );
}
