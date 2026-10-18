# ADR 0001 — Stack: HTML single-file en GitHub Pages + Google Apps Script + Google Sheets
Estado: Aceptada
Fecha: 2026-10-18

## Contexto
Los asistentes (trabajadores e invitados) se registran desde su propio celular con datos móviles,
en un local fuera de la red SEDAPAL. El evento reúne menos de 150 personas, se necesita tenerlo listo
en días, no hay presupuesto ni servidor asignado, y los organizadores de Micromedición deben poder
ver y editar los datos sin ayuda de ETIC.

## Opciones consideradas
1. **Spring Boot + Oracle en servidor interno (patrón ACREDITA / Control Acceso CM)** — pros: stack
   conocido, hexagonal, pruebas automatizadas. Contras: el servidor vive en la LAN (no es alcanzable
   desde el celular de un invitado), requiere DBA, URL pública y certificados; semanas de trámite.
2. **Google Forms + Sheets** — pros: cero código. Contras: no emite ticket QR personal, no controla la
   entrega (una por persona) ni hay escáner; los organizadores tendrían que cruzar listas a mano.
3. **Firebase (Firestore + Hosting)** — pros: concurrencia alta, tiempo real, gratis. Contras: SDK por
   CDN pesado, reglas de seguridad que escribir y mantener, los organizadores no «ven una hoja».
4. **HTML single-file en GitHub Pages + Apps Script Web App + Google Sheets** — pros: URL pública
   HTTPS gratis, sin servidor, los organizadores operan sobre una hoja de cálculo conocida, stack ya
   usado por ETIC en 5 herramientas, sin build (npm está bloqueado en la red SEDAPAL). Contras: Apps
   Script tiene arranque en frío (2–5 s) y límite de 30 ejecuciones simultáneas.

## Decisión
Opción 4. El límite de concurrencia de Apps Script sobra para 150 personas (pico estimado: 30 registros
por minuto con peticiones de < 1 s), y las escrituras se serializan con `LockService` para evitar
duplicados. Si el evento creciera a más de 1 000 asistentes llegando a la vez, se cambiaría el backend
por Firestore manteniendo el mismo `index.html` (el cliente solo conoce la URL de la API).

## Consecuencias
- Se gana: entrega en 1–2 días, costo cero, datos en manos de Micromedición, sin dependencia de DBA ni red interna.
- Se sacrifica: pruebas automatizadas del backend (Apps Script no tiene runner integrado); se compensa con
  un plan de pruebas manuales trazado a cada RF.
- Deuda: la app no funciona sin internet; el respaldo es el kiosco y la búsqueda manual.
