# ADR 0002 — Identidad por DNI libre, padrón solo para autocompletar, idempotencia por DNI
Estado: Aceptada
Fecha: 2026-10-18

## Contexto
Asisten trabajadores de SEDAPAL e invitados externos (familiares, otras áreas, invitados de la
hermandad). No existe una lista cerrada de asistentes y no se quiere dejar a nadie sin registrarse
por no estar en un padrón. A la vez, cada persona debe contar una sola vez para el almuerzo.

## Opciones consideradas
1. **Solo padrón cerrado (como ACREDITA v1 con `padron.csv`)** — pros: nombres limpios, sin colados.
   Contras: los invitados quedan fuera o requieren un flujo aparte; el padrón de Micromedición no existe aún.
2. **Registro libre sin ningún padrón** — pros: simple. Contras: nombres mal escritos, fichas inventadas.
3. **Registro libre por DNI + padrón opcional que autocompleta** — pros: nadie se queda fuera, el nombre
   sale correcto cuando la persona está en el padrón, y el padrón puede llegar tarde o no llegar.

## Decisión
Opción 3. La clave de unicidad es el **DNI** (8 dígitos; se admite CE de 9): `registrar` busca el DNI
bajo `LockService` y, si existe, devuelve el ticket ya emitido en lugar de fallar. Así un reintento de
red o una segunda lectura del QR nunca duplican a la persona (RF-03) y el asistente recupera su ticket
en otro celular con solo su DNI (RF-04). El padrón vive en la pestaña PADRON (FICHA, DNI, NOMBRES, AREA)
y solo sirve para autocompletar campos editables (RF-02).

## Consecuencias
- Se gana: flujo único para trabajadores e invitados; tolerancia a reintentos; padrón opcional.
- Se sacrifica: no se valida que un DNI sea real (no hay RENIEC); un error de dígito crea una persona
  distinta — se mitiga con la validación de 8 dígitos y la revisión del listado en el panel.
- Riesgo aceptado: quien conozca el DNI de otro puede ver su ticket; la entrega queda en LOG con hora y validador.
