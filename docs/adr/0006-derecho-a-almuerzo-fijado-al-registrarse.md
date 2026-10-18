# ADR 0006 — El derecho a almuerzo se fija en el momento del registro contra un corte que controla el organizador
Estado: Aceptada
Fecha: 2026-10-18

## Contexto
El EGCM definió que el almuerzo es solo para quienes se registran **al inicio** del evento: quien
llega después de las misas y del programa no debe recibirlo. El sistema debe hacer cumplir esa regla
sin que el staff discuta con nadie en la fila, y sin que ETIC intervenga el día del evento.

## Opciones consideradas
1. **Cerrar el registro por completo a una hora** — pros: simple. Contras: se pierde la asistencia de
   quien llega tarde (el EGCM igual quiere saber quién vino), y un después del cierre sin ticket intenta registrarse
   «por otro lado» (kiosco, un amigo) y genera discusión.
2. **Decidir en la entrega según la hora de registro** (el validador compara contra una hora de corte
   fijada después) — pros: flexible. Contras: la regla se aplica tarde y a ojo; si el corte se cambia
   después, cambia retroactivamente quién tiene derecho; auditoría confusa.
3. **Fijar `DERECHO_ALMUERZO` al registrarse** (SI si la hora actual de Lima es anterior a
   `CORTE_ALMUERZO`, NO en caso contrario), con un botón «Cerrar almuerzos» en el panel y un corte
   programado opcional en CONFIG como respaldo — pros: la persona sabe en el acto si tiene almuerzo
   (ticket gris), el validador no decide nada, el dato es inmutable y auditable, la asistencia tardía
   igual queda registrada. Contras: una excepción requiere editar la celda en la hoja.

## Decisión
Opción 3. `registrar_` calcula `derecho` una sola vez; `solicitar_` y `entregar_` rechazan con
`SIN_DERECHO` a quien tiene `NO`; reabrir el corte afecta solo a los registros posteriores. El botón
del panel escribe `CORTE_ALMUERZO = hora actual` vía `config_set` (con PIN), y el organizador puede
además dejar programada una hora (p. ej. `20/10/2026 09:00`) por si olvida pulsar. El PIN no es
editable desde la app.

## Consecuencias
- Se gana: regla clara y visible para todos (aviso en el formulario, ticket gris, rechazo rojo con la
  hora de registro), cero decisiones en la fila, asistencia completa.
- Se sacrifica: no hay «perdón» automático; una excepción la hace el organizador editando
  `DERECHO_ALMUERZO` en la hoja (queda sin LOG automático: anotarla a mano en LOG si se quiere rastro).
- Dependencia: la hora del servidor (Apps Script, zona America/Lima) es la que manda; el celular del
  asistente no interviene.
