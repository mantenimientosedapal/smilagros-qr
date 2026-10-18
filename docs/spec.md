# Especificación — Registro QR · Señor de los Milagros 2026
Versión: 0.2 · Autor: Kilder Leyva (F.24881) · Fecha: 2026-10-18
Cliente interno: Equipo Gestión Comercial y Micromedición (EGCM) · Desarrolla: ETIC – GGSE
Evento: martes 20 de octubre de 2026

Cambios v0.2: regla de corte de almuerzo (RF-15), nombre del equipo (EGCM), fecha confirmada,
padrón ZHRPOS (sin DNI → autocompleta por ficha), logos entregados.

## 1. Problema y contexto
El Equipo Gestión Comercial y Micromedición (EGCM) organiza la celebración por el Señor de los
Milagros del martes 20 de octubre de 2026, a la que asisten trabajadores de SEDAPAL e invitados, y
ofrece un almuerzo a los asistentes. Hoy no hay forma de saber con anticipación cuántos almuerzos
preparar ni de controlar que cada persona reciba uno solo. Además, el almuerzo es **solo para quien
está desde el inicio**: quien llega después de las misas y del programa no debe recibirlo. Se necesita
un registro simple desde el celular de cada asistente (vía QR), un corte de almuerzo que el
organizador controle, y un control de entrega para el personal.

## 2. Objetivo
Que el 100 % de los asistentes se registre en menos de 1 minuto desde su celular al llegar; que el
organizador cierre el derecho a almuerzo con un botón cuando empiece el programa; que los contadores
digan en tiempo real cuántos almuerzos corresponden; y que en la entrega no se duplique ningún
almuerzo ni se entregue a quien se registró tarde.

## 3. Alcance
**Incluye:**
- Registro del asistente desde su propio celular, abriendo la app con un QR impreso o compartido.
- Emisión de un ticket personal con QR (código único) para solicitar y recoger el almuerzo.
- Solicitud de almuerzo (un solo menú, sin cupo) desde el registro o desde el ticket.
- **Corte de almuerzo**: el organizador lo cierra desde el panel («Cerrar almuerzos») o lo
  programa por hora; quien se registra después queda como asistente sin almuerzo (RF-15).
- Modo validador para el personal: escanear el QR del asistente y marcar la entrega; búsqueda
  manual por DNI/nombre como respaldo; rechazo automático de después del cierre y de entregas repetidas.
- Panel con contadores en vivo, estado del corte, listado, exportación a Excel y QR del evento.
- Modo kiosco en una tablet del staff para quien no tenga celular o datos.
- Configuración del evento (nombre, fecha, PIN, apertura/cierre, corte) en la hoja de cálculo.
- Padrón de trabajadores (ZHRPOS 23/09/2026, 2 456 fichas) para autocompletar nombre y área.
- Bitácora de acciones (registro, solicitud, entrega, cambios de configuración).

**No incluye (fuera de alcance):**
- Varias opciones de menú, cupos o listas de espera (definido por el cliente: un solo menú, sin cupo).
- Pagos, donaciones, programa de actividades, difusión o envío de correos/mensajes.
- Autenticación corporativa (Azure AD/MSAL): asisten invitados y el staff usa celulares personales.
- Integración con Oracle, SAP o el padrón oficial de RRHH; el padrón es un Excel pegado en la hoja.
- Constancias o certificados (eso es ACREDITA).
- Funcionamiento sin internet (sin conexión no hay registro; el respaldo es el kiosco y la lista manual).

## 4. Actores / usuarios
| Actor | Qué hace | Acceso |
|---|---|---|
| ASISTENTE (trabajador o invitado) | Se registra al llegar, recibe su ticket QR, solicita su almuerzo y lo muestra al recoger | URL pública, sin clave |
| VALIDADOR (staff del EGCM en la entrega) | Escanea tickets y marca entregas; busca por DNI si el QR falla | Vista `#validador` + PIN |
| ORGANIZADOR (responsable del EGCM) | Cierra el almuerzo cuando empieza el programa, ve contadores y listado, exporta Excel, imprime el QR del evento, abre/cierra registro | Vista `#panel` + PIN; edita la hoja CONFIG |
| KIOSCO (tablet del staff) | Registro asistido para quien no tiene celular | Vista `#kiosco` |

## 5. Requisitos funcionales
| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | El asistente se registra con tipo (TRABAJADOR / INVITADO), ficha (solo trabajador), DNI (8 dígitos; se admite CE de 9), nombres y apellidos, y área o empresa (opcional) | Alta |
| RF-02 | Si la ficha (o el DNI) existe en la hoja PADRON, el sistema autocompleta nombres y área (editables); el padrón ZHRPOS no trae DNI, así que la ficha es la clave de autocompletado | Media |
| RF-03 | Un DNI se registra una sola vez: si ya existe, el sistema devuelve el ticket existente sin crear duplicado (idempotente), incluso con el registro cerrado | Alta |
| RF-04 | Al registrarse, el sistema emite un ticket con código único no secuencial y lo muestra como QR; el ticket queda guardado en el celular y se puede recuperar con el DNI | Alta |
| RF-05 | El asistente con derecho solicita su almuerzo marcando la casilla al registrarse o con el botón del ticket; cada solicitud se registra con fecha y hora | Alta |
| RF-06 | El validador, tras ingresar el PIN, escanea el QR con la cámara del celular, ve nombre y estado, y confirma la entrega; el sistema rechaza una segunda entrega del mismo ticket indicando hora y quién entregó | Alta |
| RF-07 | El validador puede buscar por DNI o nombre y marcar la entrega sin escanear (respaldo) | Media |
| RF-08 | El panel muestra contadores en vivo: registrados, con almuerzo, después del cierre, solicitados, entregados y pendientes; se actualiza solo cada 15 s | Alta |
| RF-09 | El panel lista a los asistentes con búsqueda y exporta el listado a Excel (.xlsx) | Media |
| RF-10 | El panel genera el QR del evento (QR que abre la app) listo para imprimir | Media |
| RF-11 | El modo kiosco registra asistentes uno tras otro sin guardar el ticket en el dispositivo y marca el origen KIOSCO | Media |
| RF-12 | Los organizadores configuran en la hoja CONFIG: nombre, fecha y lugar del evento, PIN, mensaje de bienvenida, corte de almuerzo, y si el registro y la solicitud están abiertos; desde el panel pueden cerrar/abrir el registro y el almuerzo sin tocar la hoja | Media |
| RF-13 | Toda acción de registro, solicitud, entrega (aceptada o rechazada), cambio de configuración e intento de PIN fallido queda en la hoja LOG con fecha, hora, actor y resultado | Media |
| RF-14 | La app muestra la identidad institucional: logo SEDAPAL en cabecera, pie «ETIC · SEDAPAL» con logo KOLH, y pantalla «Acerca de» con versión | Alta |
| RF-15 | **Corte de almuerzo**: el derecho a almuerzo se fija en el momento del registro. Antes del corte → con almuerzo; después → asistente sin almuerzo (constancia de asistencia en gris, sin botón de solicitud, rechazo discreto en la entrega). El corte lo fija el organizador con «Cerrar almuerzos» o por hora en CONFIG, y puede reabrirlo; los registros ya hechos no cambian | Alta |

## 6. Requisitos no funcionales
| ID | Tipo | Requisito |
|---|---|---|
| RNF-01 | Rendimiento | Registro completo (envío + ticket en pantalla) en < 3 s en 4G; primer uso del backend (arranque en frío) < 6 s con mensaje «Registrando…» visible |
| RNF-02 | Capacidad | Soporta 150 asistentes con picos de 30 registros por minuto sin pérdida ni duplicados (escrituras serializadas con bloqueo en el backend) |
| RNF-03 | Disponibilidad | URL pública HTTPS (GitHub Pages) y backend sin servidor propio (Google Apps Script); sin instalación en el celular |
| RNF-04 | Compatibilidad | Chrome y Safari móviles de los últimos 3 años; cámara trasera para el escaneo; funciona también en laptop/tablet |
| RNF-05 | Seguridad | PIN verificado en el servidor en cada escritura de validador/panel; códigos de ticket aleatorios (30 bits) no adivinables; la hoja solo se comparte con los organizadores; sin teléfono ni correo del asistente (datos mínimos); el PIN no se puede cambiar desde la app |
| RNF-06 | Robustez | Reintento automático (3 intentos con espera creciente) ante error de red; botones bloqueados mientras se envía (anti doble clic); todo error se muestra al usuario en texto claro; un reintento de entrega del mismo validador dentro de 2 min no se cuenta como rechazo |
| RNF-07 | Usabilidad móvil | Formulario en una sola pantalla, campos de 16 px (sin zoom en iOS), botones de ≥ 48 px, QR de ≥ 220 px |
| RNF-08 | Zona horaria | Todas las marcas de fecha/hora en America/Lima, formato `dd/MM/yyyy HH:mm:ss`; el corte en `dd/MM/yyyy HH:mm` |
| RNF-09 | Integridad de datos | Todas las columnas de ASISTENTES, PADRON, CONFIG y LOG en formato texto (conservan ceros a la izquierda y fechas tal cual); nombres en mayúsculas conservando Ñ y tildes |
| RNF-10 | Mantenibilidad | Un solo `index.html` con los logos embebidos (WebP base64); librerías solo por CDN (cdnjs); sin paso de build obligatorio (compatible con la red SEDAPAL, donde npm está bloqueado); `tools/build.py` solo para re-embeber logos |

## 7. Criterios de aceptación (por requisito)

RF-01:
  Dado que un asistente abre la app desde el QR del evento
  Cuando elige INVITADO, ingresa DNI `71234567`, nombres `MARÍA PÉREZ` y pulsa «Registrarme»
  Entonces en ≤ 3 s ve su ticket con QR y en la hoja ASISTENTES existe una fila con esos datos, fecha de registro y origen CELULAR

RF-01 (validación):
  Dado el formulario de registro
  Cuando el DNI tiene menos de 8 dígitos o los nombres menos de 5 caracteres
  Entonces no se envía nada y el campo errado se marca con un mensaje bajo él

RF-02:
  Dado que PADRON contiene la ficha `24881` con nombres y área
  Cuando el trabajador escribe esa ficha (5 dígitos)
  Entonces nombres y área se completan solos y siguen siendo editables; el DNI lo escribe él

RF-03:
  Dado que el DNI `71234567` ya está registrado
  Cuando alguien vuelve a registrarse con ese DNI (aunque escriba otro nombre o el registro esté cerrado)
  Entonces no se crea otra fila, se muestra el ticket original con el aviso «Ya estabas registrado» y el LOG anota REGISTRO_DUPLICADO

RF-04:
  Dado que el asistente se registró
  Cuando cierra el navegador y vuelve a abrir la app en el mismo celular
  Entonces ve directamente su ticket; y si cambia de celular, con «Recuperar mi ticket» + DNI vuelve a verlo

RF-05:
  Dado un asistente registrado con derecho y sin almuerzo solicitado
  Cuando pulsa «Solicitar almuerzo» en su ticket
  Entonces el ticket cambia a «Almuerzo solicitado» y la hoja guarda SI con fecha/hora de solicitud

RF-06 (entrega):
  Dado un validador autenticado con PIN y un ticket con derecho y almuerzo no entregado
  Cuando escanea el QR y pulsa «ENTREGAR ALMUERZO»
  Entonces ve confirmación verde con el nombre, la hoja guarda ENTREGADO=SI, fecha/hora y nombre del validador, y el escáner queda listo para el siguiente

RF-06 (rechazo):
  Dado un ticket ya entregado a las 13:05 por «ROSA»
  Cuando se vuelve a escanear
  Entonces se muestra en rojo «Ya entregado · 13:05 · ROSA», no se modifica la hoja y el LOG anota ENTREGA_RECHAZADA

RF-06 (PIN):
  Dado un PIN incorrecto
  Cuando se intenta ingresar o marcar una entrega
  Entonces el servidor responde PIN_INVALIDO, no modifica nada y el LOG anota PIN_INVALIDO

RF-07:
  Dado un asistente cuyo QR no se puede leer
  Cuando el validador escribe su DNI o parte del nombre en «Buscar»
  Entonces aparece el asistente con su estado y el botón «Entregar» con las mismas reglas de RF-06; si se registró en el kiosco hace segundos, la lista se refresca sola

RF-08:
  Dado 120 registrados (110 con almuerzo, 10 después del cierre), 100 solicitudes y 95 entregas
  Cuando el organizador abre el panel
  Entonces ve 120 / 110 / 10 / 100 / 95 / 5 pendientes, y a los 15 s los números se actualizan solos

RF-09:
  Dado el panel con asistentes
  Cuando pulsa «Exportar Excel»
  Entonces descarga `asistentes-smilagros-2026.xlsx` con las mismas columnas que la hoja ASISTENTES (incluida DERECHO_ALMUERZO)

RF-10:
  Dado el panel
  Cuando pulsa «QR del evento» e imprime
  Entonces sale solo el QR con el nombre del evento y la URL; al escanearlo con la cámara del celular se abre el registro

RF-11:
  Dado la tablet del staff en `#kiosco`
  Cuando registra a una persona y pulsa «Nuevo registro»
  Entonces el formulario queda limpio, el ticket anterior no queda guardado en la tablet y la fila tiene origen KIOSCO

RF-12:
  Dado que en CONFIG se pone REGISTRO_ABIERTO = NO (o el organizador pulsa «Cerrar registro»)
  Cuando un asistente nuevo intenta registrarse
  Entonces ve «El registro está cerrado» y la hoja no cambia; el resto de vistas sigue operativa

RF-13:
  Dado cualquier registro, solicitud, entrega, cambio de configuración o PIN fallido
  Cuando termina (aceptado o rechazado)
  Entonces la hoja LOG tiene una fila con fecha/hora, acción, ID, DNI, actor y resultado

RF-14:
  Dado cualquier vista de la app
  Cuando se abre
  Entonces se ve el logo SEDAPAL en la cabecera, el pie «ETIC · SEDAPAL» con el logo KOLH, y «Acerca de» muestra la versión y termina con «ETIC – SEDAPAL»

RF-15 (cierre):
  Dado el panel con el almuerzo VIGENTE y 40 registrados
  Cuando el organizador pulsa «Cerrar almuerzos» y confirma
  Entonces CONFIG guarda CORTE_ALMUERZO con la hora actual, el estado pasa a CERRADO, los 40 registrados conservan su derecho y el LOG anota CONFIG

RF-15 (después del cierre):
  Dado el almuerzo CERRADO
  Cuando una persona se registra (en su celular o en el kiosco)
  Entonces ve el aviso «El registro de almuerzos ya se cerró», la casilla de almuerzo aparece deshabilitada, su ticket sale gris con «Asistencia registrada · HH:mm» sin botón de solicitud, y la fila tiene DERECHO_ALMUERZO = NO

RF-15 (entrega):
  Dado un ticket después del cierre
  Cuando el validador lo escanea o lo busca
  Entonces ve en rojo «Registrado después del cierre HH:mm», no hay botón «Entregar», la hoja no cambia y el LOG anota ENTREGA_RECHAZADA con SIN_DERECHO

RF-15 (programado y reapertura):
  Dado CORTE_ALMUERZO = `20/10/2026 09:00` en CONFIG
  Cuando son las 09:01
  Entonces los nuevos registros salen sin almuerzo sin que nadie pulse nada; y si el organizador pulsa «Reabrir almuerzos», CORTE_ALMUERZO queda vacío y los nuevos registros vuelven a tener derecho (los registrados después del cierre ya registrados no cambian)

RNF-02:
  Dado 30 registros enviados en el mismo minuto con DNIs distintos
  Cuando terminan
  Entonces hay exactamente 30 filas nuevas, con 30 IDs distintos y ninguna fila vacía o cortada

RNF-06:
  Dado un celular sin señal por 5 s
  Cuando el asistente pulsa «Registrarme»
  Entonces el botón queda bloqueado, la app reintenta hasta 3 veces y, si no logra conectar, muestra «Sin conexión…» sin registrar dos veces al recuperar la señal

## 8. Supuestos
- Evento: martes 20 de octubre de 2026; el lugar se carga en CONFIG (EVENTO_LUGAR) cuando el EGCM lo indique.
- Cronograma operativo acordado con el EGCM: (1) registro al llegar con el QR del afiche, (2) el organizador pulsa «Cerrar almuerzos» cuando empieza la misa/programa, (3) entrega de almuerzos con el validador. Quien llegue después del cierre puede registrar su asistencia, pero sin almuerzo.
- Los asistentes tienen celular con cámara y datos móviles o Wi-Fi; quien no, usa el kiosco.
- El local tiene cobertura móvil razonable (si no, el respaldo es el kiosco + búsqueda manual desde un equipo con conexión).
- La hoja de cálculo vive en una cuenta Google administrada por Kilder y se comparte con los organizadores como lectores/editores; el EGCM es dueño funcional de los datos.
- Padrón: reporte ZHRPOS al 23/09/2026 (ETIC_ERCP_EC), 2 456 trabajadores, sin columna DNI. Se carga en PADRON con FICHA, NOMBRES y AREA; el DNI lo escribe cada trabajador.
- La impresión del QR del evento y la operación en el día la hace el staff del EGCM con sus propios celulares.
- Un solo menú y sin cupo (confirmado por el cliente); los contadores sirven para dimensionar el catering.
- Logos: el de KOLH es el oficial; el de SEDAPAL entregado el 18/10 es una versión con efecto de brillo (se usa limpiada); se reemplaza por el PNG transparente oficial de SIGDA cuando Kilder esté en LAPTOP EMPRESA.

## 9. Riesgos y dependencias externas
| Riesgo / dependencia | Impacto | Mitigación / responsable |
|---|---|---|
| Sin cobertura móvil en el local | Alto | Kiosco en tablet del staff + búsqueda manual; registro previo por WhatsApp los días anteriores |
| El organizador olvida cerrar el almuerzo | Alto | Corte programado por hora en CONFIG (CORTE_ALMUERZO) como respaldo del botón; el panel muestra el estado en grande |
| Arranque en frío de Apps Script (2–5 s en la primera llamada) | Medio | Mensaje «Registrando…», reintentos; el staff abre la app antes del evento para «calentarla» |
| PIN compartido entre varios validadores | Medio | PIN solo para el día, se cambia en la hoja después; cada validador escribe su nombre y queda en LOG; los PIN fallidos quedan en LOG |
| Cuota de Apps Script (30 ejecuciones simultáneas) | Bajo con 150 personas | Peticiones cortas (< 1 s); reintento con espera creciente en el cliente |
| Cámara bloqueada en navegadores dentro de WhatsApp/Facebook | Medio | Instrucción al staff: abrir `#validador` en Chrome o Safari, no en el navegador interno de WhatsApp |
| Recuperación de ticket solo con DNI (alguien podría ver el ticket ajeno si conoce el DNI) | Bajo | Riesgo aceptado por el tamaño del evento; la entrega queda en LOG con validador y hora |
| Reclamo de un después del cierre («yo sí estaba») | Medio | El ticket y el panel muestran la hora exacta de registro; la decisión es del organizador, que puede marcar la entrega manualmente editando DERECHO_ALMUERZO en la hoja |
| Reloj del servidor vs hora local | Bajo | Apps Script con zona America/Lima en `appsscript.json`; el corte se compara en Lima |
