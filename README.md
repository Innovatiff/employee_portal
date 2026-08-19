# Águila — Portal del Colaborador

Aplicación web para el equipo de **Tienda Despensas** y **Tienda Cocina**.
Pensada primero para teléfono.

Cada colaborador entra con **su correo y su contraseña**. La cuenta la crea
la gerencia al contratar; la contraseña inicial es el PIN de 6 dígitos.

## Qué puede hacer

| Sección  | Contenido |
|----------|-----------|
| Inicio   | Turno abierto, horas y estimado del período, accesos rápidos |
| Horas    | Turnos por período de pago, navegable hacia atrás |
| Pagos    | Recibos con horas, tarifa, bruto y estado |
| Permisos | Solicitar permiso y ver el estado, con el motivo si fue denegado |
| Pedidos  | Sólo si la gerencia lo asignó como encargado |
| Grupo    | Anuncios del equipo y mensajes privados |

Cada quien ve **únicamente lo suyo**: las reglas de Firestore impiden leer
horas, recibos, permisos o conversaciones de otra persona.

## Puesta en marcha

Son archivos estáticos: basta con servirlos. Requiere en Firebase:

- **Authentication → Correo/contraseña** activado
- Las reglas de Firestore del repositorio `domcub_employee` publicadas

## Notificaciones push

Para que llegue un aviso al teléfono con la app cerrada:

1. Pega la clave VAPID en `VAPID_KEY`, arriba de `app.js`. Sale de Firebase
   Console → Configuración del proyecto → Cloud Messaging → *Certificados
   push web*. Es la misma que usa el software de gerencia.
2. La Cloud Function que envía vive en el repositorio `domcub_employee`,
   en `functions/`. Con desplegarla una vez basta para las dos apps.

`firebase-messaging-sw.js` tiene que quedar en la raíz del sitio y con ese
nombre exacto: el SDK lo busca así.

**En iPhone** sólo funciona si el portal se añade a la pantalla de inicio
(Compartir → Añadir a inicio). Es cosa de Safari, no del código. Por eso el
`manifest.json`: instalado se ve como una app, sin barra del navegador.

El permiso se ofrece con un botón, no al entrar. Si el navegador recibe un
«no» no vuelve a preguntar, así que no conviene gastarlo antes de que la
persona entienda para qué es.
