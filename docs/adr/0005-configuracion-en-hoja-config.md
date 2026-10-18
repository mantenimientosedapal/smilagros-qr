# ADR 0005 — La configuración del evento vive en la pestaña CONFIG de la hoja, no en el código
Estado: Aceptada
Fecha: 2026-10-18

## Contexto
La fecha y el lugar del evento no estaban confirmados al diseñar; el PIN se debe poder cambiar el
mismo día; los organizadores quieren cerrar el registro o la solicitud de almuerzo cuando el catering
ya esté encargado. ETIC no debería intervenir para ninguno de esos cambios.

## Opciones consideradas
1. **Constantes en `index.html`** — contras: cada cambio exige editar el archivo y volver a publicar
   en GitHub Pages; el PIN quedaría visible en el código fuente.
2. **Pestaña CONFIG (CLAVE / VALOR) leída por el servidor en cada petición** — pros: los
   organizadores editan una celda y el cambio aplica al instante; el PIN nunca sale del servidor.
   Contras: una lectura extra por petición (despreciable: 8 filas).

## Decisión
Opción 2. Claves: `EVENTO_NOMBRE`, `EVENTO_FECHA`, `EVENTO_LUGAR`, `MENSAJE_BIENVENIDA`,
`PIN_VALIDADOR`, `REGISTRO_ABIERTO`, `SOLICITUD_ABIERTA`, `VERSION_DATOS`. `setupInicial()` crea la
pestaña con valores por defecto y la app pinta el nombre/fecha/mensaje desde `config`. El servidor,
no el cliente, hace cumplir `REGISTRO_ABIERTO` y `SOLICITUD_ABIERTA`.

## Consecuencias
- Se gana: autonomía de Micromedición y un solo `index.html` reutilizable para otro evento cambiando la hoja.
- Se sacrifica: nada relevante; una celda mal escrita (p. ej. «si» en vez de «SI») se tolera normalizando a mayúsculas.
