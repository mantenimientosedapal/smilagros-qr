# ADR 0003 — El ticket es un código aleatorio corto generado en el servidor y verificado en cada entrega
Estado: Aceptada
Fecha: 2026-10-18

## Contexto
El asistente muestra un QR en su celular y el validador lo escanea con la cámara de otro celular, a
veces con poca luz y pantallas con brillo bajo. El QR debe leerse rápido y no debe poder fabricarse
un ticket válido sin haberse registrado.

## Opciones consideradas
1. **QR con el DNI** — pros: trivial. Contras: cualquiera genera el QR de otro con una app gratuita.
2. **QR con JSON firmado (HMAC) con todos los datos** — pros: verificable sin red. Contras: QR denso
   (lento de leer en pantalla), clave compartida en el cliente o firma solo en servidor (entonces la
   verificación igual requiere red), más código.
3. **QR con un ID aleatorio corto (`SM26-XXXXXX`) y verificación en servidor** — pros: QR de ~11
   caracteres (se lee de lejos y con pantalla sucia), imposible de adivinar (alfabeto de 32 símbolos
   sin 0/O/1/I, 6 posiciones ≈ 1,07 × 10⁹), el estado real siempre está en la hoja. Contras: la
   validación requiere conexión (que de todos modos se necesita para marcar la entrega).

## Decisión
Opción 3. El servidor genera el ID bajo `LockService`, comprueba que no exista y lo guarda; el QR
codifica solo el ID. En la entrega, el validador consulta `ticket` (muestra nombre y estado) y luego
confirma con `entregar`, que vuelve a verificar en la hoja que `ALMUERZO_ENTREGADO = NO` antes de
escribir. Dos lecturas seguidas del mismo QR producen una entrega y un rechazo, nunca dos entregas.

## Consecuencias
- Se gana: lectura rápida del QR, imposibilidad práctica de falsificar, una sola fuente de verdad.
- Se sacrifica: no hay validación sin conexión; se cubre con la búsqueda manual desde cualquier equipo con señal.
- El ID también se muestra en texto bajo el QR para dictarlo si la cámara falla.
