# Registro QR · Señor de los Milagros 2026

Registro de asistentes por QR y control de entrega de almuerzos para el **Equipo Gestión Comercial y
Micromedición (EGCM)** · SEDAPAL. Evento: martes 20 de octubre de 2026.

Desarrollado por Kilder Orlando Leyva Herrera – Ficha 24881 · Grupo Gestión de Servicios (GGSE) – ETIC.

| Componente | Dónde vive | Archivo |
|---|---|---|
| App (asistente, ticket, validador, panel, kiosco) | GitHub Pages (URL pública HTTPS) | `index.html` (único archivo, logos embebidos) |
| Backend REST | Google Apps Script, vinculado a la hoja | `gas/Code.gs` + `gas/appsscript.json` |
| Base de datos | Google Sheet (pestañas ASISTENTES, PADRON, CONFIG, LOG) | la crea `setupInicial()` |
| Padrón de trabajadores | Pestaña PADRON | `padron/PADRON-smilagros-2026.xlsx` (2 456 fichas, ZHRPOS 23/09/2026) |
| Documentación | `docs/` | `spec.md`, `diseno.md`, `adr/`, `plan-pruebas.md`, `manual-usuario.md` |

Versión 1.1.0 · Proceso: `docs/spec.md` (requisitos RF-01…RF-15) → `docs/diseno.md` (C4, secuencias, datos, API) → código → pruebas → este README.

## 1. Regla del evento (lo más importante)

El almuerzo es para quien se registra **al inicio del evento**. El plan operativo es sencillo: cuando empieza
la misa/programa se **retira el QR del afiche** (o simplemente ya no se registra a nadie más). El sistema
tiene además un respaldo discreto: el organizador puede pulsar **«Cerrar almuerzos»** en el panel (o dejar
programada una hora en CONFIG); desde ese momento los nuevos registros quedan solo como constancia de
asistencia, con textos amables para el asistente, y el validador ve un aviso al escanearlos. Los ya
registrados no cambian. Detalle en `docs/adr/0006`.

## 2. Despliegue (una sola vez, ~25 min) — LAPTOP PERSONAL o LAPTOP EMPRESA

### 2.1 Backend (Google Sheet + Apps Script)
1. En Google Drive: **Nuevo → Hojas de cálculo**. Nombre: `SM2026 - Registro QR`.
2. En la hoja: **Extensiones → Apps Script**. Borra el contenido de `Código.gs`, pega `gas/Code.gs` y guarda (Ctrl+S).
3. En el editor: **Configuración del proyecto (engranaje) → marca «Mostrar el archivo de manifiesto appsscript.json»**.
   Abre `appsscript.json`, reemplaza todo por `gas/appsscript.json` y guarda (fija zona horaria America/Lima).
4. Arriba, selector de función → `setupInicial` → **Ejecutar**. Autoriza con tu cuenta (Permisos avanzados →
   Ir a SM2026). Se crean las pestañas y CONFIG con valores por defecto (PIN `2026`).
5. **Implementar → Nueva implementación → tipo: Aplicación web** → Ejecutar como: **Yo** · Acceso: **Cualquier
   persona** → Implementar. Copia la **URL de la aplicación web** (termina en `/exec`).
6. Prueba en el navegador: `<URL>?action=ping` → debe responder `{"ok":true,"version":"1.1.0",...}`.
7. Pestaña **CONFIG** de la hoja: cambia `PIN_VALIDADOR` (solo lo sabe el staff), `EVENTO_LUGAR` y, si quieres
   respaldo automático, `CORTE_ALMUERZO` = `20/10/2026 09:00` (hora en que empieza la misa).
8. Pestaña **PADRON**: abre `padron/PADRON-smilagros-2026.xlsx`, copia las 4 columnas desde la fila 2 y pégalas en
   PADRON desde A2 (o Archivo → Importar → Reemplazar hoja actual, con la pestaña PADRON seleccionada).
9. Comparte la hoja con el responsable del EGCM (editor) para que vea los datos y edite CONFIG.

> Cada vez que cambies `Code.gs`: **Implementar → Administrar implementaciones → lápiz → Versión: Nueva → Implementar**.
> Si solo cambias CONFIG o datos, no hay que volver a implementar.

### 2.2 App (GitHub Pages)
1. `index.html`: reemplaza `REEMPLAZAR_DEPLOYMENT_ID` en `APP.GAS_URL` por tu URL `/exec` (y opcionalmente `SHEET_URL`).
2. Crea el repo `smilagros-qr` en GitHub (público) y sube `index.html` (basta ese archivo; el resto del proyecto es opcional).
3. **Settings → Pages → Branch: main / root → Save**. La URL será `https://<usuario>.github.io/smilagros-qr/`.
4. Abre la URL en el celular: debe verse la bienvenida con la fecha del evento (viene de CONFIG). Si aparece la franja
   ámbar «Falta configurar GAS_URL», el paso 1 no se guardó.
5. En `#panel` (PIN) → **QR del evento → Imprimir**: ese es el afiche.

Comandos (PowerShell, en la carpeta del proyecto, LAPTOP PERSONAL o LAPTOP EMPRESA):
```powershell
git init
git add .
git commit -m "feat(smilagros): registro QR y control de almuerzos v1.1.0 [RF-01..RF-15]"
git branch -M main
git remote add origin https://github.com/<usuario>/smilagros-qr.git
git push -u origin main
```

### 2.3 Logos
Los logos ya van embebidos en `index.html`. Para reemplazar el de SEDAPAL por el PNG transparente oficial
(LAPTOP EMPRESA: `SIGDA\src\main\resources\membrete\`): copia el PNG a `assets/logo-sedapal.png`, ejecuta
`python tools/build.py` (requiere Pillow: `pip install pillow`) y vuelve a subir `index.html`.

## 3. Operación el día del evento (runbook)

| Hora | Quién | Qué |
|---|---|---|
| Día anterior | Kilder | Abrir la app, registrar un DNI de prueba (`00000001`) y borrar su fila en ASISTENTES; comprobar que `#validador` abre la cámara en el celular del staff (en Chrome/Safari, no dentro de WhatsApp) |
| Llegada | Asistentes | Escanean el afiche → se registran (trabajador: ficha + DNI; invitado: DNI + nombres) → captura del ticket |
| Llegada | Staff con tablet | `#kiosco` para quien no tiene celular/datos |
| Empieza la misa | Organizador | Retirar el QR del afiche. Respaldo: `#panel` → **Cerrar almuerzos** → confirmar (debe decir CERRADO) |
| Almuerzo | Validadores (2 celulares) | `#validador` → PIN + nombre → cámara → escanear ticket → **ENTREGAR ALMUERZO**. Rojo = ya entregado o registrado después del cierre (consultar con el organizador si hay duda). QR ilegible → pestaña Buscar por DNI |
| Durante | Organizador | Panel: Pendientes = almuerzos que faltan por entregar; Después del cierre = llegaron después del corte |
| Cierre | Organizador | Exportar Excel; cambiar `PIN_VALIDADOR` en CONFIG; `REGISTRO_ABIERTO` = NO |

Excepción (el organizador decide dar almuerzo a un después del cierre): en la hoja ASISTENTES cambia `DERECHO_ALMUERZO`
de `NO` a `SI` en esa fila; el validador ya puede entregarle. Anota el motivo a mano en LOG.

## 4. Pruebas

- Automáticas (requieren Node 18+ y `npm install jsdom` — en LAPTOP PERSONAL, porque en la red SEDAPAL npm está bloqueado):
  ```powershell
  cd tools\test
  npm install jsdom@24
  node test-app.js ..\..\index.html     # 33 verificaciones de flujo (registro, ticket, validador, panel, kiosco, corte)
  node test-gas.js ..\..\gas\Code.gs    # 30 verificaciones del backend con un Sheet simulado
  ```
- Manuales en el celular real: `docs/plan-pruebas.md` (PM-01 a PM-15, una por requisito).

## 5. Rollback

| Problema | Acción |
|---|---|
| Una versión nueva de `Code.gs` falla | Implementar → Administrar implementaciones → lápiz → Versión: elegir la anterior → Implementar (la URL no cambia) |
| `index.html` nuevo falla | `git revert HEAD` + `git push` (GitHub Pages republica en ~1 min) o volver a subir el `index.html` anterior |
| Se filtró el PIN | CONFIG → `PIN_VALIDADOR` nuevo; los validadores vuelven a ingresar (nada más cambia) |
| Hay que parar todo | CONFIG → `REGISTRO_ABIERTO` = NO y `SOLICITUD_ABIERTA` = NO; los tickets ya emitidos siguen consultables |
| Datos dañados en la hoja | Archivo → Historial de versiones → restaurar (Google Sheets guarda cada cambio) |

## 6. Problemas frecuentes

| Síntoma | Causa / solución |
|---|---|
| «Sin conexión con el servidor» en todos los celulares | La implementación web no tiene acceso «Cualquier persona», o la URL no es la `/exec`. Probar `<URL>?action=ping` |
| La primera petición tarda 5 s | Arranque en frío de Apps Script; normal. Abrir la app 10 min antes del evento |
| La cámara no abre | Navegador interno de WhatsApp/Facebook: abrir el enlace en Chrome o Safari; aceptar el permiso; HTTPS obligatorio (GitHub Pages lo cumple) |
| Un DNI con cero inicial se guardó sin el cero | No ocurre si se corrió `setupInicial()` (columnas en formato texto). Si la pestaña se creó a mano: Formato → Número → Texto sin formato en toda la hoja |
| «PIN incorrecto» cuando era correcto | Se cambió el PIN en CONFIG; cerrar sesión (Salir) e ingresar de nuevo |
| El panel muestra VIGENTE después de cerrar | Pulsar Actualizar; si persiste, revisar en CONFIG que `CORTE_ALMUERZO` tenga formato `dd/MM/yyyy HH:mm` |
| Sin señal en el local | Kiosco en una tablet con chip de otro operador + búsqueda manual desde ese equipo |

## 7. Estructura del repositorio

```
smilagros-qr/
├── index.html                 # app completa (generada desde src/ con los logos embebidos)
├── src/index.template.html    # plantilla fuente (marcadores __LOGO_*__)
├── assets/                    # logo-sedapal.png · logo-kolh.png (fuente para tools/build.py)
├── gas/                       # Code.gs · appsscript.json
├── padron/                    # PADRON-smilagros-2026.xlsx
├── tools/                     # build.py · test/test-app.js · test/test-gas.js
└── docs/                      # spec.md · diseno.md · adr/0001-0006 · plan-pruebas.md · manual-usuario.md
```
