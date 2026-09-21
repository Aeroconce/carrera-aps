// Diálogo "Registrar capacitación" desde el módulo (doc 05 §4): elige el funcionario y usa los mismos campos de la ficha.

import { DialogoFormulario, type CampoFormulario } from "@/components/dominio/dialogo-formulario";
import { textosAcciones } from "@/app/(admin)/funcionarios/[id]/textos-acciones";
import { registrarCapacitacionDesdeListaAction } from "@/lib/acciones/capacitaciones";
import { textosCapacitaciones as t } from "./textos";

export function DialogoRegistrarCapacitacion({ funcionarios }: { funcionarios: Array<{ id: string; etiqueta: string }> }) {
  const tc = textosAcciones.capacitacion;
  const campos: CampoFormulario[] = [
    { nombre: "funcionarioId", etiqueta: t.funcionario, tipo: "select", requerido: true, ancho: "completo", opciones: funcionarios.map((f) => ({ valor: f.id, etiqueta: f.etiqueta })) },
    { nombre: "nombre", etiqueta: tc.nombre, tipo: "text", requerido: true, ancho: "completo" },
    { nombre: "institucionDicta", etiqueta: tc.institucion, tipo: "text", requerido: true },
    { nombre: "tipo", etiqueta: tc.tipo, tipo: "select", requerido: true, valorInicial: "CURSO", opciones: tc.tipos },
    { nombre: "horas", etiqueta: tc.horas, tipo: "number", requerido: true, min: 1 },
    { nombre: "notaOEvaluacion", etiqueta: tc.nota, tipo: "text", ayuda: tc.notaAyuda },
    { nombre: "fechaInicio", etiqueta: tc.inicio, tipo: "fecha", requerido: true },
    { nombre: "fechaTermino", etiqueta: tc.termino, tipo: "fecha", requerido: true },
    { nombre: "periodo", etiqueta: tc.periodo, tipo: "number", ayuda: tc.periodoAyuda, min: 2000, max: 2100 },
    { nombre: "aprobado", etiqueta: tc.aprobada, tipo: "checkbox", valorInicial: true },
    { nombre: "esOtraComuna", etiqueta: tc.otraComuna, tipo: "checkbox", valorInicial: false },
  ];
  return (
    <DialogoFormulario
      titulo={tc.titulo}
      textoBoton={t.registrar}
      tamanoBoton="default"
      campos={campos}
      accion={registrarCapacitacionDesdeListaAction}
      textoEnviar={tc.enviar}
      exito={tc.exito}
    />
  );
}
