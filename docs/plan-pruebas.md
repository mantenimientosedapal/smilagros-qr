# Plan de pruebas — Registro QR · Señor de los Milagros 2026
Versión: 1.0 · Fecha: 2026-10-18 · Trazabilidad: cada caso referencia su RF de `spec.md`

## Pirámide aplicada a esta herramienta
| Nivel | Qué cubre | Cómo | Estado |
|---|---|---|---|
| Automática · app | 33 verificaciones de flujo en jsdom con backend simulado (registro, duplicado, ticket, validador, entrega, rechazo, panel, corte, kiosco, recuperación, Acerca de) | `node tools/test/test-app.js index.html` | ✅ verde 18/10 |
| Automática · backend | 30 verificaciones de `Code.gs` con Sheet en memoria (setup idempotente, normalización, idempotencia por DNI, corte AHORA / por hora / reapertura, SIN_DERECHO, YA_ENTREGADO, reintento 2 min, stats, LOG, registro cerrado) | `node tools/test/test-gas.js gas/Code.gs` | ✅ verde 18/10 |
| Manual · celular real | Cámara, QR real, GitHub Pages + Apps Script reales, Excel, impresión | Casos PM-01…PM-15 de abajo | ⬜ pendiente (lunes 19/10) |
| Estrés | 30 registros en 1 minuto (RNF-02) | 3 personas registrando 10 DNIs ficticios cada una en 60 s | ⬜ pendiente |

## Casos manuales (ejecutar en el celular, con la URL real)

| ID | RF | Pasos | Resultado esperado | OK |
|---|---|---|---|---|
| PM-01 | RF-01 | Abrir la URL, Invitado, DNI 71234567, nombres MARÍA PÉREZ, Registrarme | Ticket con QR en < 3 s; fila en ASISTENTES con origen CELULAR | ⬜ |
| PM-01b | RF-01 | DNI de 5 dígitos → Registrarme | No envía; mensaje rojo bajo el DNI | ⬜ |
| PM-02 | RF-02 | Trabajador, ficha 24881 | Nombres y área se completan solos; se pueden editar | ⬜ |
| PM-03 | RF-03 | Registrar otra vez el DNI 71234567 con otro nombre | Mismo ticket, aviso «Ya estabas registrado», LOG con REGISTRO_DUPLICADO, sin fila nueva | ⬜ |
| PM-04 | RF-04 | Cerrar el navegador, abrir la URL | Entra directo al ticket. En otro celular: Recuperar mi ticket + DNI → mismo ticket | ⬜ |
| PM-05 | RF-05 | Registrar con la casilla desmarcada; en el ticket pulsar Solicitar almuerzo | Chip «Almuerzo solicitado ✓»; hoja con SI y FECHA_SOLICITUD | ⬜ |
| PM-06a | RF-06 | `#validador`, PIN + nombre, Iniciar cámara, escanear el ticket, ENTREGAR ALMUERZO | Verde «Entregado», hoja con ENTREGADO=SI, hora y validador; a los 2,5 s vuelve a escanear | ⬜ |
| PM-06b | RF-06 | Escanear el mismo ticket de nuevo | Rojo «Ya entregado · HH:mm · NOMBRE»; sin cambios; LOG ENTREGA_RECHAZADA | ⬜ |
| PM-06c | RF-06 | Ingresar con PIN incorrecto | «PIN incorrecto»; LOG con PIN_INVALIDO | ⬜ |
| PM-07 | RF-07 | Pestaña Buscar, escribir 3 letras del nombre, Entregar | Mismo resultado que PM-06a; un registrado en kiosco hace segundos aparece | ⬜ |
| PM-08 | RF-08 | `#panel`, PIN, esperar 15 s tras una entrega desde otro celular | Contadores y hora se actualizan solos | ⬜ |
| PM-09 | RF-09 | Exportar Excel | `asistentes-smilagros-2026.xlsx` con las 14 columnas, abre en Excel | ⬜ |
| PM-10 | RF-10 | QR del evento → Imprimir | Solo el QR, nombre y URL en la hoja; escaneado con la cámara abre el registro | ⬜ |
| PM-11 | RF-11 | Tablet en `#kiosco`: registrar, Nuevo registro | Formulario limpio, sin ticket guardado en la tablet, fila con ORIGEN=KIOSCO | ⬜ |
| PM-12 | RF-12 | Panel → Cerrar registro; intentar registrar un DNI nuevo | «El registro está cerrado»; recuperar ticket sigue funcionando; Abrir registro lo revierte | ⬜ |
| PM-13 | RF-13 | Revisar la pestaña LOG tras PM-01…PM-12 | Una fila por acción con fecha, acción, ID, DNI, actor y resultado | ⬜ |
| PM-14 | RF-14 | Mirar cabecera, pie y Acerca de en cada vista | Logo SEDAPAL arriba, «ETIC · SEDAPAL» + logo KOLH abajo, Acerca de con versión 1.1.0 y «ETIC – SEDAPAL» | ⬜ |
| PM-15a | RF-15 | Panel → Cerrar almuerzos → confirmar | Estado CERRADO desde HH:mm; CONFIG.CORTE_ALMUERZO con la hora; LOG CONFIG; los registrados conservan su derecho | ⬜ |
| PM-15b | RF-15 | Registrar un DNI nuevo con el almuerzo cerrado | Aviso «El registro de almuerzos ya se cerró», casilla deshabilitada, ticket gris «Registrado después del cierre», fila con DERECHO_ALMUERZO=NO | ⬜ |
| PM-15c | RF-15 | Validador escanea el ticket después del cierre | Rojo «Registrado después del cierre HH:mm», sin botón Entregar, LOG con SIN_DERECHO | ⬜ |
| PM-15d | RF-15 | CONFIG.CORTE_ALMUERZO = una hora pasada; luego Reabrir almuerzo desde el panel | Nuevos registros sin almuerzo; tras reabrir, con almuerzo; los registrados después del cierre previos siguen en NO | ⬜ |
| PM-16 | RNF-06 | Modo avión 5 s al pulsar Registrarme | Botón bloqueado, reintentos, «Sin conexión…»; al volver la señal, un solo registro | ⬜ |

Antes de pasar a producción: borrar las filas de prueba de ASISTENTES y LOG, poner el PIN definitivo y volver a comprobar `?action=ping`.
