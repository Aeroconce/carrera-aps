// Textos del módulo de acceso (doc 12: sentence case, verbos en infinitivo, mensajes concretos y sin disculpas).
// Todo texto visible sale de aquí, no de literales sueltos (doc 15).

export const textosAuth = {
  producto: "Carrera APS",
  descripcion: "Sistema de Gestión de Carrera Funcionaria",

  login: {
    titulo: "Iniciar sesión",
    correo: "Correo",
    contrasena: "Contraseña",
    entrar: "Iniciar sesión",
    entrando: "Entrando…",
    olvido: "¿Olvidaste tu contraseña?",
    olvidoInfo:
      "El administrador del sistema reinicia las contraseñas. Escríbele indicando tu nombre y tu RUT.",
    errores: {
      correoInvalido: "Escribe un correo válido.",
      contrasenaVacia: "Escribe tu contraseña.",
      credenciales: "Correo o contraseña incorrectos.",
      intentos: "Demasiados intentos. Espera 15 minutos.",
      desactivada: "La cuenta está desactivada. Contacta al administrador del sistema.",
      conexion: "No se pudo conectar. Reintenta; si persiste, avisa al administrador.",
    },
  },

  cambiarContrasena: {
    titulo: "Cambiar contraseña",
    introPrimerIngreso: "Es tu primer ingreso. Define una contraseña nueva antes de continuar.",
    intro: "Elige una contraseña nueva. Se cerrarán tus otras sesiones.",
    actual: "Contraseña actual",
    nueva: "Contraseña nueva",
    confirmacion: "Repetir contraseña nueva",
    ayudaNueva: "Mínimo 10 caracteres.",
    guardar: "Cambiar contraseña",
    guardando: "Guardando…",
    errores: {
      actualIncorrecta: "La contraseña actual no es correcta.",
      corta: "La contraseña nueva debe tener al menos 10 caracteres.",
      noCoincide: "Las contraseñas no coinciden.",
      igual: "La contraseña nueva debe ser distinta de la actual.",
      conexion: "No se pudo guardar. Reintenta; si persiste, avisa al administrador.",
    },
  },

  sesion: {
    cerrar: "Cerrar sesión",
  },

  sinPermiso: {
    titulo: "Sin permiso",
    texto: "Tu cuenta no tiene acceso a esta sección.",
    volver: "Volver al inicio",
  },
} as const;
