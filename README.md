# El Águila — Portal del Colaborador

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
